import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { generateClaimToken, hashClaimToken, claimTokenExpiry } from '@/lib/listing-import/claim-token'
import { canRefreshLink } from '@/lib/listing-import/waiting-drafts'
import { sendEmail } from '@/lib/email/send'
import { listingImportClaimEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
const bodySchema = z.object({ token: z.string().min(1).max(200) })

// Same answer whatever happened, so the endpoint reveals nothing about drafts.
const DONE = { ok: true, message: 'If this draft is still waiting, a fresh link is on its way to the address it was imported with.' }

/**
 * POST /api/listing-imports/refresh  { token }  (an EXPIRED claim token)
 *
 * The expired-link page used to say "import again", which threw away the
 * draft. Now it can ask for a fresh link. The new link is emailed to the
 * address the draft was imported with, never returned to the caller, so a
 * forwarded or leaked old link cannot be turned into access. Only expired
 * links qualify, which also stops repeated clicks from sending repeated mail.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: row } = await service
    .from('listing_import_requests')
    .select('id, status, listing_id, email, claimed_by_user_id, claim_token_expires_at, extracted_data')
    .eq('claim_token_hash', hashClaimToken(body.token))
    .maybeSingle()

  if (!row || !canRefreshLink(row)) return NextResponse.json(DONE)

  const rawToken = generateClaimToken()
  const { error } = await service
    .from('listing_import_requests')
    .update({
      claim_token_hash: hashClaimToken(rawToken),
      claim_token_expires_at: claimTokenExpiry().toISOString(),
    })
    .eq('id', row.id)
  if (error) {
    console.error('[listing-imports/refresh] mint failed', { requestId: row.id, error })
    return NextResponse.json({ error: 'Could not send a new link. Try again in a minute.' }, { status: 500 })
  }

  const title = (row.extracted_data as { title?: string | null } | null)?.title ?? null
  const { subject, html } = listingImportClaimEmail({
    claimUrl: `${APP_URL}/claim-listing/${rawToken}`,
    listingTitle: title,
  })
  const sent = await sendEmail({ to: row.email!, subject, html })
  if (!sent.ok) {
    console.error('[listing-imports/refresh] email failed', { requestId: row.id })
    return NextResponse.json({ error: 'Could not send a new link. Try again in a minute.' }, { status: 502 })
  }

  console.info('[listing-imports/refresh] fresh link sent', { requestId: row.id })
  return NextResponse.json(DONE)
}
