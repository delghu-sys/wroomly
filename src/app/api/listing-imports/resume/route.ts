import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateClaimToken, hashClaimToken, claimTokenExpiry } from '@/lib/listing-import/claim-token'
import { canResumeDraft } from '@/lib/listing-import/waiting-drafts'

export const runtime = 'nodejs'

/**
 * POST /api/listing-imports/resume  (form field `requestId`)
 *
 * "Finish your listing" on the dashboard. The signed-in owner of an approved,
 * unpublished draft gets a fresh claim token and is sent straight to the
 * review page. Ownership = the draft's import address matches the account's
 * address, or this account already holds the draft (lib/listing-import/
 * waiting-drafts). Minting replaces any older link, which is harmless: the
 * only person who can reach this route for the draft is its owner.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in?next=/dashboard', request.url), 303)

  const form = await request.formData().catch(() => null)
  const requestId = String(form?.get('requestId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.redirect(new URL('/dashboard', request.url), 303)
  }

  const service = createServiceClient()
  const { data: row } = await service
    .from('listing_import_requests')
    .select('id, status, listing_id, email, claimed_by_user_id')
    .eq('id', requestId)
    .maybeSingle()

  if (!row || !canResumeDraft(row, { id: user.id, email: user.email })) {
    return NextResponse.redirect(new URL('/dashboard', request.url), 303)
  }

  const rawToken = generateClaimToken()
  const { error } = await service
    .from('listing_import_requests')
    .update({
      claim_token_hash: hashClaimToken(rawToken),
      claim_token_expires_at: claimTokenExpiry().toISOString(),
    })
    .eq('id', row.id)
  if (error) {
    console.error('[listing-imports/resume] mint failed', { requestId: row.id, error })
    return NextResponse.redirect(new URL('/dashboard', request.url), 303)
  }

  console.info('[listing-imports/resume] resumed', { requestId: row.id, userId: user.id })
  return NextResponse.redirect(new URL(`/claim-listing/${rawToken}`, request.url), 303)
}
