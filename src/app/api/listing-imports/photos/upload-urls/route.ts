import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'
import { UPLOAD_LIMITS } from '@/lib/listing-import/schema'
import { createSignedUploadTargets, UploadError } from '@/lib/listing-import/uploads'

export const runtime = 'nodejs'

// Review-time photos become PUBLIC listing photos at publish — images only.
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

const bodySchema = z.object({
  token: z.string().min(1),
  files: z
    .array(
      z.object({
        mimeType: z.enum(IMAGE_MIMES),
        sizeBytes: z.number().int().positive().max(UPLOAD_LIMITS.maxBytesPerFile),
      }),
    )
    .min(1)
    .max(UPLOAD_LIMITS.maxFiles),
})

/**
 * POST /api/listing-imports/photos/upload-urls
 *
 * Phase 1 of the review-time photo upload (see ../route.ts for phase 2).
 * Auth'd claimer only. Mints signed upload URLs under the request's own
 * prefix so the browser uploads straight to storage — same Vercel body-cap
 * reasoning as the main import flow.
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

  // Light abuse cap: a draft never legitimately needs more than ~30 photos
  // across its lifetime (storage abuse guard; auth + token already gate).
  if ((req.personal_image_paths?.length ?? 0) + body.files.length > 30) {
    return NextResponse.json({ error: 'Too many photos on this draft.' }, { status: 429 })
  }

  try {
    const targets = await createSignedUploadTargets(
      req.id,
      body.files.map(f => ({ kind: 'personal' as const, mimeType: f.mimeType })),
    )
    return NextResponse.json({ ok: true, targets })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Could not prepare the upload.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
