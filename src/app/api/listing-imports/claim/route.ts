import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'

export const runtime = 'nodejs'

const bodySchema = z.object({ token: z.string().min(1) })

/**
 * POST /api/listing-imports/claim
 * Associates a completed import draft with the authenticated user.
 * Body: { token } (the raw claim token from the email link).
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
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: req } = await service
    .from('listing_import_requests')
    .select('id, status, claim_token_expires_at, claimed_by_user_id, listing_id')
    .eq('claim_token_hash', hashClaimToken(body.token))
    .maybeSingle()

  if (!req || req.status !== 'completed') {
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  }
  if (isClaimTokenExpired(req.claim_token_expires_at)) {
    return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
  }
  if (req.listing_id) {
    // Already published.
    return NextResponse.json(
      { error: 'This listing has already been published.', listingId: req.listing_id },
      { status: 409 },
    )
  }
  if (req.claimed_by_user_id && req.claimed_by_user_id !== user.id) {
    return NextResponse.json(
      { error: 'This draft has already been claimed by another account.' },
      { status: 409 },
    )
  }

  // Associate (idempotent if the same user re-claims).
  if (req.claimed_by_user_id !== user.id) {
    const { error } = await service
      .from('listing_import_requests')
      .update({ claimed_by_user_id: user.id, claimed_at: new Date().toISOString() })
      .eq('id', req.id)
    if (error) {
      console.error('[listing-imports/claim] associate failed', error)
      return NextResponse.json({ error: 'Could not claim the draft.' }, { status: 500 })
    }
  }
  console.info('[listing-imports/claim] claimed', { requestId: req.id, userId: user.id })

  return NextResponse.json({ ok: true, requestId: req.id })
}
