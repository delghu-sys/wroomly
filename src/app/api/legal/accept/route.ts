import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal'

/**
 * Clickwrap acceptance endpoint.
 *
 * GET  → whether the current user has accepted the CURRENT policy versions
 *        (drives the re-acceptance prompt).
 * POST → record an acceptance for the current user. The server stamps the
 *        versions, IP and user agent itself; the client sends nothing but the
 *        context, so a forged request can't claim acceptance of different
 *        terms than the ones live right now.
 *
 * Rows are written under the service role — legal_acceptances deliberately
 * has no authenticated RLS policies (see migration 039).
 */

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip')
  return ip && ip.length > 0 ? ip : null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ authenticated: false, current: true })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('legal_acceptances')
    .select('id')
    .eq('user_id', user.id)
    .eq('terms_version', TERMS_VERSION)
    .eq('privacy_version', PRIVACY_VERSION)
    .limit(1)

  // Deploy-order safety: if migration 039 isn't applied yet the query errors.
  // Report "current" so the prompt never blocks the app on a missing table.
  if (error) {
    console.error('[legal/accept] lookup failed:', error.message)
    return NextResponse.json({ authenticated: true, current: true })
  }

  return NextResponse.json({
    authenticated: true,
    current: (data?.length ?? 0) > 0,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let context = 'reacceptance'
  try {
    const body = (await req.json()) as { context?: string }
    if (body.context === 'signup') context = 'signup'
  } catch {
    // no body → default context
  }

  const service = createServiceClient()
  const { error } = await service.from('legal_acceptances').insert({
    user_id: user.id,
    ip_address: clientIp(req),
    user_agent: req.headers.get('user-agent'),
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    acceptance_context: context,
  })

  if (error) {
    console.error('[legal/accept] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not record acceptance' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
