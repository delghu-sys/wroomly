import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractedListingDraftSchema } from '@/lib/listing-import/schema'
import { normalizeExtractedListing } from '@/lib/listing-import/normalize'

/**
 * POST /api/admin/agents/draft — save admin edits to an agent-sourced draft.
 *
 * Deliberately separate from /api/admin/import-review's approve action, which
 * this superficially resembles: approve mints a NEW claim token and SENDS a
 * claim email. Agent-sourced drafts already have a token and their one email
 * is owned by outreach.mjs — running them through approve would send a second
 * email and violate "one message per person, ever." This route only ever
 * updates `extracted_data`; it never touches status, the claim token, or
 * sends anything, so it is safe to call on any listing_import_requests row
 * regardless of which pipeline created it.
 */

const bodySchema = z.object({
  importRequestId: z.string().uuid(),
  draft: extractedListingDraftSchema,
})

export async function POST(request: Request) {
  const authed = await createClient()
  const {
    data: { user },
  } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: requester } = await authed
    .from('users')
    .select('user_type, is_suspended')
    .eq('id', user.id)
    .single()
  if (requester?.is_suspended || requester?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: existing } = await service
    .from('listing_import_requests')
    .select('id')
    .eq('id', body.importRequestId)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  const { error } = await service
    .from('listing_import_requests')
    .update({ extracted_data: normalizeExtractedListing(body.draft) })
    .eq('id', body.importRequestId)

  if (error) {
    console.error('[admin/agents/draft] save failed', error)
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
