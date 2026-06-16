import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'
import { uploadImportImages, UploadError } from '@/lib/listing-import/uploads'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/listing-imports/photos
 * Lets the authenticated claimer add real housing photos at review time —
 * essential for text-only imports (which arrive with zero photos but still
 * need ≥1 to publish). Multipart: token + photos[]. Appends to the request's
 * personal_image_paths and returns the new {path,url}s for the picker.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })
  }
  const token = form.get('token')
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 })
  }
  const files = form.getAll('photos').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'No photos provided.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: req } = await service
    .from('listing_import_requests')
    .select('id, status, claim_token_expires_at, claimed_by_user_id, listing_id, personal_image_paths')
    .eq('claim_token_hash', hashClaimToken(token))
    .maybeSingle()

  if (!req || req.status !== 'completed')
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  if (isClaimTokenExpired(req.claim_token_expires_at))
    return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
  if (req.listing_id)
    return NextResponse.json({ error: 'This listing was already published.' }, { status: 409 })
  if (req.claimed_by_user_id !== user.id)
    return NextResponse.json({ error: 'You don’t have access to this draft.' }, { status: 403 })

  let uploaded
  try {
    uploaded = await uploadImportImages(files, { requestId: req.id, kind: 'personal' })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Upload failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const nextPaths = [...(req.personal_image_paths ?? []), ...uploaded.map(u => u.path)]
  const { error } = await service
    .from('listing_import_requests')
    .update({ personal_image_paths: nextPaths })
    .eq('id', req.id)
  if (error) {
    console.error('[listing-imports/photos] persist failed', error)
    return NextResponse.json({ error: 'Could not save photos.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, photos: uploaded })
}
