import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribe } from '@/lib/agents/unsubscribe-token'
import { normalizeEmail } from '@/lib/agents/outreach-policy'

/**
 * GET /api/outreach/unsubscribe?email=…&t=…
 *
 * One-click opt-out, reached from an outreach email. No login, no lookup: the
 * token is an HMAC of the address, so it proves the link was issued by us and
 * cannot be used to opt somebody else out.
 *
 * Idempotent, and deliberately returns the same page whether or not the address
 * was already suppressed — a stranger must not be able to use this endpoint to
 * test whether we hold a given address.
 */
export const dynamic = 'force-dynamic'

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title} · Wroomly</title>
     <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#0E2A47;line-height:1.6">
       <h1 style="font-size:1.4rem;margin-bottom:.5rem">${title}</h1>
       <p style="color:#5b6b7f">${body}</p>
       <p style="margin-top:2rem"><a href="https://wroomly.app" style="color:#0E2A47">wroomly.app</a></p>
     </body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = normalizeEmail(searchParams.get('email'))
  const token = searchParams.get('t') ?? ''

  if (!email || !verifyUnsubscribe(email, token)) {
    return page('That link didn’t work', 'It may have been altered or truncated by your email client. Reply to the message and we’ll remove you by hand.', 400)
  }

  const service = createServiceClient()
  const { error } = await service
    .from('outreach_suppressions')
    .upsert({ email, reason: 'unsubscribed' }, { onConflict: 'email' })

  if (error) {
    console.error('[outreach/unsubscribe] suppression write failed:', error.message)
    return page('Something went wrong', 'We could not record that just now. Reply to the message and we’ll remove you by hand.', 500)
  }

  // Stop any pending lead for this address from being picked up again. Failure
  // here is not fatal: the suppression above is what the send path checks.
  const { error: leadErr } = await service
    .from('sourced_leads')
    .update({ status: 'skipped', skip_reason: 'unsubscribed' })
    .eq('contact_email', email)
    .in('status', ['new', 'drafted'])
  if (leadErr) console.warn('[outreach/unsubscribe] lead cleanup failed:', leadErr.message)

  return page('You’re unsubscribed', 'We won’t email you again. Any draft listing we prepared for you stays unpublished and will expire on its own.')
}
