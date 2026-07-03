import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { ATTRIBUTION_COOKIE, sanitizeSource } from '@/lib/attribution'

export const runtime = 'nodejs'

/**
 * POST /api/waitlist  { email: string, source?: string }
 *
 * Public endpoint for the supply-only /coming-soon page: a renter leaves their
 * email to be notified at launch. Writes to renter_waitlist via the service
 * role (the table is RLS-locked to service-role only). Re-submits are a no-op
 * thanks to the case-insensitive unique index, so we treat 23505 as success.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  let source =
    typeof body.source === 'string' ? body.source.slice(0, 120) : null

  // Enrich with the first-touch attribution cookie (?ref=/?utm_source= —
  // see src/lib/attribution.ts) so waitlist signups credit the flyer/rep
  // that brought the visitor, not just the page they submitted from.
  const attr = sanitizeSource(
    (await cookies()).get(ATTRIBUTION_COOKIE)?.value ?? null
  )
  if (attr) {
    source = (source ? `${source} ref:${attr}` : `ref:${attr}`).slice(0, 120)
  }

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    )
  }

  const service = createServiceClient()
  const { error } = await service
    .from('renter_waitlist')
    .insert({ email, source })

  // 23505 = already on the list (unique index). Treat as success.
  if (error && error.code !== '23505') {
    console.error('[waitlist] insert failed:', error.message)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
