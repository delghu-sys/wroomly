import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractedListingDraftSchema } from '@/lib/listing-import/schema'
import { normalizeExtractedListing } from '@/lib/listing-import/normalize'
import { generateClaimToken, hashClaimToken, claimTokenExpiry } from '@/lib/listing-import/claim-token'
import { sendEmail } from '@/lib/email/send'
import { listingImportClaimEmail } from '@/lib/email/templates'
import type { ExtractedListingDraft } from '@/types/listing-import'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    id: z.string().uuid(),
    draft: extractedListingDraftSchema, // admin-edited draft
  }),
  z.object({
    action: z.literal('reject'),
    id: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
])

/**
 * POST /api/admin/import-review
 * Admin approves (→ sends the submitter their claim email) or rejects an
 * AI import draft. Admin-only; verified server-side via the service client.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: me } = await service
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { data: req } = await service
    .from('listing_import_requests')
    .select('id, status, email')
    .eq('id', body.id)
    .maybeSingle()

  if (!req || req.status !== 'awaiting_admin_review') {
    return NextResponse.json(
      { error: 'This import is not awaiting review (already handled?).' },
      { status: 409 },
    )
  }

  const reviewedAt = new Date().toISOString()

  // ── Reject ──
  if (body.action === 'reject') {
    await service
      .from('listing_import_requests')
      .update({
        status: 'failed',
        error_message: body.reason?.trim() || 'Rejected by admin.',
        reviewed_by_user_id: user.id,
        reviewed_at: reviewedAt,
      })
      .eq('id', req.id)
    console.info('[admin/import-review] rejected', { requestId: req.id, by: user.id })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // ── Approve → mint token, complete, email the submitter ──
  const draft = normalizeExtractedListing(body.draft as ExtractedListingDraft)
  const rawToken = generateClaimToken()

  const { error: updateErr } = await service
    .from('listing_import_requests')
    .update({
      status: 'completed',
      extracted_data: draft,
      claim_token_hash: hashClaimToken(rawToken),
      claim_token_expires_at: claimTokenExpiry().toISOString(),
      reviewed_by_user_id: user.id,
      reviewed_at: reviewedAt,
    })
    .eq('id', req.id)

  if (updateErr) {
    console.error('[admin/import-review] approve update failed', updateErr)
    return NextResponse.json({ error: 'Could not approve. Try again.' }, { status: 500 })
  }

  const { subject, html } = listingImportClaimEmail({
    claimUrl: `${APP_URL}/claim-listing/${rawToken}`,
    listingTitle: draft.title,
  })
  const emailResult = await sendEmail({ to: req.email, subject, html })
  if (!emailResult.ok) {
    console.error('[admin/import-review] claim email failed', { requestId: req.id })
    return NextResponse.json(
      { ok: false, error: 'Approved, but the submitter email failed to send. Check Resend.' },
      { status: 502 },
    )
  }

  console.info('[admin/import-review] approved + emailed', { requestId: req.id, by: user.id })
  return NextResponse.json({ ok: true, status: 'approved' })
}
