import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const patchSchema = z.object({
  email_alerts: z.boolean().optional(),
  name: z.string().max(80).nullable().optional(),
})

/**
 * PATCH /api/saved-searches/[id] — toggle email alerts or rename.
 * DELETE /api/saved-searches/[id] — remove.
 *
 * RLS handles authorization (user can only see/touch their own).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.email_alerts !== undefined) updates.email_alerts = body.email_alerts
  if (body.name !== undefined) updates.name = body.name?.trim() || null
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('[saved-searches] patch failed', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[saved-searches] delete failed', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
