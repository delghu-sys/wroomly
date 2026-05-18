import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/actions
 *
 * Single funnel for every admin mutation that previously ran from the
 * client (verify user, suspend, promote, approve/reject listing).
 *
 * Why this exists: the `users.update` RLS policy is column-restricted in
 * migration 007 so unprivileged users can no longer change
 * `user_type`/`is_verified`/`is_suspended` from the browser. Admins write
 * via the service-role client (RLS-bypassing) — but only after we verify
 * the requester is actually an admin server-side.
 *
 * Body shape:
 *   { kind: 'user', userId, action }                 // verify | suspend | unsuspend | promote_admin | demote_admin
 *   { kind: 'listing', listingId, action, notes? }   // approve | reject (notes required when rejecting)
 */

const userActionSchema = z.object({
  kind: z.literal('user'),
  userId: z.string().uuid(),
  action: z.enum([
    'verify',
    'suspend',
    'unsuspend',
    'promote_admin',
    'demote_admin',
  ]),
})

const listingActionSchema = z.object({
  kind: z.literal('listing'),
  listingId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
})

const bodySchema = z.discriminatedUnion('kind', [
  userActionSchema,
  listingActionSchema,
])

export async function POST(request: Request) {
  // 1. Auth — must be a signed-in admin. Verified via the auth client
  //    (which is RLS-bound), not the service client.
  const authed = await createClient()
  const {
    data: { user },
  } = await authed.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: requester } = await authed
    .from('users')
    .select('user_type, is_suspended')
    .eq('id', user.id)
    .single()

  if (requester?.is_suspended) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (requester?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Validate body.
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 3. Service-role client bypasses RLS for the privileged write.
  const service = await createServiceClient()

  if (body.kind === 'user') {
    // Self-demotion guard — don't let the last admin lock themselves out.
    if (body.userId === user.id && body.action === 'demote_admin') {
      const { count } = await service
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'admin')
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin.' },
          { status: 409 }
        )
      }
    }

    const patch: Record<string, unknown> =
      body.action === 'verify'
        ? { is_verified: true }
        : body.action === 'suspend'
          ? { is_suspended: true }
          : body.action === 'unsuspend'
            ? { is_suspended: false }
            : body.action === 'promote_admin'
              ? { user_type: 'admin' }
              : { user_type: 'consumer' }

    const { error } = await service
      .from('users')
      .update(patch)
      .eq('id', body.userId)

    if (error) {
      console.error('admin user mutation failed:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    await service.from('admin_actions').insert({
      admin_id: user.id,
      target_type: 'user',
      target_id: body.userId,
      action:
        body.action === 'verify'
          ? 'verify_user'
          : body.action === 'suspend'
            ? 'suspend_user'
            : body.action === 'unsuspend'
              ? 'unsuspend_user'
              : body.action === 'promote_admin'
                ? 'promote_admin'
                : 'demote_admin',
    })

    return NextResponse.json({ ok: true })
  }

  // ── kind === 'listing' ─────────────────────────────────────────────
  if (body.action === 'reject' && !body.notes?.trim()) {
    return NextResponse.json(
      { error: 'Rejection note is required.' },
      { status: 400 }
    )
  }

  const status = body.action === 'approve' ? 'active' : 'archived'

  const { error } = await service
    .from('listings')
    .update({ status })
    .eq('id', body.listingId)

  if (error) {
    console.error('admin listing mutation failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  await service.from('admin_actions').insert({
    admin_id: user.id,
    target_type: 'listing',
    target_id: body.listingId,
    action: body.action === 'approve' ? 'approve_listing' : 'reject_listing',
    notes: body.notes ?? null,
  })

  return NextResponse.json({ ok: true })
}
