import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'
import { UPLOAD_LIMITS } from '@/lib/listing-import/schema'
import { verifyUploadedPaths, signImportUrls, UploadError } from '@/lib/listing-import/uploads'

export const runtime = 'nodejs'

const bodySchema = z.object({
  token: z.string().min(1),
  paths: z.array(z.string().min(1).max(300)).min(1).max(UPLOAD_LIMITS.maxFiles),
})

/**
 * POST /api/listing-imports/photos
 *
 * Phase 2 of the review-time photo upload (phase 1: ./upload-urls mints
 * signed targets, the browser PUTs straight to storage). Verifies the
 * claimed paths against the bucket (existence, prefix, images-only, size),
 * appends them to the draft, and returns fresh signed READ urls for the
 * picker. Essential for text-only imports, which arrive with zero photos
 * but still need ≥1 to publish.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: req } = await service
    .from('listing_import_requests')
    .select('id, status, claim_token_expires_at, claimed_by_user_id, listing_id, personal_image_paths')
    .eq('claim_token_hash', hashClaimToken(body.token))
    .maybeSingle()

  if (!req || req.status !== 'completed')
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  if (isClaimTokenExpired(req.claim_token_expires_at))
    return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
  if (req.listing_id)
    return NextResponse.json({ error: 'This listing was already published.' }, { status: 409 })
  if (req.claimed_by_user_id !== user.id)
    return NextResponse.json({ error: 'You don’t have access to this draft.' }, { status: 403 })

  // Never trust the client's paths — verify against storage. Images only:
  // these become public listing photos.
  const existing = new Set(req.personal_image_paths ?? [])
  const fresh = body.paths.filter(p => !existing.has(p))
  let verified: string[]
  try {
    verified = await verifyUploadedPaths(req.id, fresh, 'personal', { imagesOnly: true })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Could not verify the photos.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
  if (verified.length === 0) {
    return NextResponse.json({ error: 'No new photos found.' }, { status: 400 })
  }

  const nextPaths = [...(req.personal_image_paths ?? []), ...verified]
  const { error } = await service
    .from('listing_import_requests')
    .update({ personal_image_paths: nextPaths })
    .eq('id', req.id)
  if (error) {
    console.error('[listing-imports/photos] persist failed', error)
    return NextResponse.json({ error: 'Could not save photos.' }, { status: 500 })
  }

  const signed = await signImportUrls(verified)
  const photos = verified.map(path => ({ path, url: signed[path] ?? '' }))
  return NextResponse.json({ ok: true, photos })
}
