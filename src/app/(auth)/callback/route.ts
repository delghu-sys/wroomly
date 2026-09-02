import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ATTRIBUTION_COOKIE, sanitizeSource } from '@/lib/attribution'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal'
import { UMICH } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // Supabase sets this for recovery flows
  const rawNext = searchParams.get('next') ?? '/'

  // Prevent open redirect — allow only same-origin relative paths. Rejects
  // protocol-relative ("//evil.com") and backslash-bypass ("/\evil.com",
  // which browsers normalize toward "//evil.com") forms.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : '/'

  // Surface the real reason instead of a generic message. When an OAuth
  // round-trip fails (provider/redirect/linking issue) Supabase comes back
  // with ?error=&error_description= and NO code; pass that through + log it.
  const providerError =
    searchParams.get('error_description') || searchParams.get('error')
  if (providerError) {
    console.error('[callback] provider error:', providerError)
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(providerError)}`
    )
  }

  if (!code) {
    console.error('[callback] no code in callback url')
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent('Could not complete sign-in. Please try again.')}`
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[callback] exchangeCodeForSession failed:', error?.message)
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error?.message ?? 'Could not complete sign-in.')}`
    )
  }

  // Password recovery flow lands here with `type=recovery`. The user is
  // now in a temporary session that lets them call `auth.updateUser`.
  // Send them to /reset-password to actually set a new password instead
  // of dropping them on the dashboard.
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  const meta = (data.user.user_metadata ?? {}) as {
    full_name?: string
    university?: string
    user_type?: 'supplier' | 'consumer'
  }

  // Google OAuth can't carry user_metadata up front, so the chosen role rides
  // along as a query param on the redirect. Prefer it; fall back to the email
  // sign-up's metadata claim. Google also gives us a name to seed the profile.
  const intendedType = searchParams.get('intended_type')
  const claimedRaw = intendedType ?? meta.user_type
  const googleName =
    (meta as { name?: string; full_name?: string }).name ??
    (meta as { full_name?: string }).full_name ??
    null

  // Server-side enforcement: `user_type` claim is only accepted if it's not
  // `admin` (you don't make yourself admin via signup). Any email may be a
  // supplier — verification (not role) is what gates listing.
  const effectiveType = claimedRaw === 'supplier' ? 'supplier' : 'consumer'

  // ── UMich verification (the blue check) ──────────────────────────────────
  // Verified ⟺ signed in with Google on an @umich.edu account. @umich.edu is
  // Google Workspace, so a Google login on that domain necessarily went through
  // UMich Weblogin + Duo — a live, 2FA-backed SSO session we can trust, far
  // stronger than "received an email at an @umich.edu address". We check the
  // provider + email domain server-side and NEVER trust a client claim. Email/
  // password and non-umich Google accounts are valid users, just unverified.
  const provider =
    (data.user.app_metadata?.provider as string | undefined) ??
    (data.user.app_metadata?.providers?.[0] as string | undefined)
  const emailDomain = (data.user.email ?? '').toLowerCase().split('@')[1] ?? ''
  // Primary signal: the login itself is a Google @umich.edu session. Secondary:
  // a linked Google @umich.edu identity (the "verify later" path, where someone
  // who joined with email/non-umich Google links their UMich Google — the
  // primary email may still be the original, so inspect the identities too).
  const hasUmichGoogleIdentity = (data.user.identities ?? []).some(i => {
    const idEmail = (i.identity_data?.email as string | undefined)?.toLowerCase() ?? ''
    return i.provider === 'google' && idEmail.endsWith('@umich.edu')
  })
  const isUmichSso =
    (provider === 'google' && emailDomain === 'umich.edu') || hasUmichGoogleIdentity

  // Critical: only create a `users` row on first login. NEVER overwrite an
  // existing row's `user_type` — that would silently demote admins back to
  // consumer on their next OAuth refresh.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!existing) {
    // First-touch acquisition source, set by the middleware when the visitor
    // originally landed with ?ref=/?utm_source= (see src/lib/attribution.ts).
    // Recorded once, at account creation — the liquidity dashboard's
    // "signups by source" splits on this.
    const cookieStore = await cookies()
    const signupSource = sanitizeSource(
      cookieStore.get(ATTRIBUTION_COOKIE)?.value ?? null
    )

    // Core columns that have existed since 001 — always safe to insert.
    const row = {
      id: data.user.id,
      email: data.user.email!,
      full_name: googleName,
      // Google OAuth carries no user_metadata, so an SSO signup has no
      // university to read — but a verified @umich.edu SSO session tells us
      // exactly which one it is. Without this the best-verified accounts were
      // the only ones with a blank university.
      university: meta.university ?? (isUmichSso ? UMICH : null),
      user_type: effectiveType,
      // Only a real UMich Google SSO login earns the badge (see above).
      is_verified: isUmichSso,
    }

    // Deploy-order safety: `signup_source` (migration 030) and
    // `verification_method` (036) are newer columns — if this code ships before
    // either migration is applied, an insert naming the missing column would
    // fail and break every new signup. So progressively degrade: try the full
    // row, then drop the newest add-ons, then bare. is_verified still lands
    // correctly on the bare path (the badge just can't record its method until
    // 036 is applied).
    const full = {
      ...row,
      signup_source: signupSource,
      verification_method: isUmichSso ? 'umich_sso' : null,
    }
    const { error: e1 } = await supabase.from('users').insert(full)
    if (e1) {
      console.warn('[callback] full insert failed, retrying without new columns:', e1.message)
      const { error: e2 } = await supabase.from('users').insert(row)
      if (e2) console.error('[callback] bare user insert failed:', e2.message)
    }
  } else if (isUmichSso) {
    // Returning login that IS a UMich SSO session — upgrade an existing
    // unverified account to verified (the "verify to list" path: a user who
    // joined with email or a non-umich Google later links/logs-in with their
    // UMich Google account). Only ever an upgrade; a normal re-login never
    // strips verification, and user_type/other fields are untouched.
    //
    // Runs under the SERVICE role, not the session client. Migration 032
    // revoked UPDATE on `users` from `authenticated` and re-granted only the
    // profile columns, so is_verified/verification_method are deliberately
    // unwritable from a user session — the admin route uses the service role
    // for the same reason. With the session client this update was denied and
    // the error swallowed, so nobody ever earned the badge by verifying later.
    const service = createServiceClient()
    const { error: upErr } = await service
      .from('users')
      .update({ is_verified: true, verification_method: 'umich_sso' })
      .eq('id', data.user.id)
      .eq('is_verified', false)
    // Deploy-order safety: if verification_method (036) isn't applied yet, retry
    // the upgrade without it so the badge still lands.
    if (upErr) {
      const { error: bareErr } = await service
        .from('users')
        .update({ is_verified: true })
        .eq('id', data.user.id)
        .eq('is_verified', false)
      if (bareErr) console.error('[callback] verification upgrade failed:', bareErr.message)
    }

    // Backfill the university for any UMich SSO account that has none — the
    // rows created before the insert above learned to set it. Only ever fills
    // a null, so a value the user typed themselves is never overwritten.
    const { error: uniErr } = await service
      .from('users')
      .update({ university: UMICH })
      .eq('id', data.user.id)
      .is('university', null)
    if (uniErr) console.error('[callback] university backfill failed:', uniErr.message)
  }


  // ── Clickwrap evidence ────────────────────────────────────────────────────
  // On FIRST login, record the Terms + Privacy acceptance the user affirmed
  // before getting here: the email form's required checkbox stamps
  // terms_accepted_at into user_metadata, and the OAuth buttons append
  // accepted=1 to the redirect only once their consent box is ticked. The
  // server stamps versions/IP/UA itself. Failure to log never blocks login —
  // the LegalReacceptance gate will simply re-prompt.
  if (!existing) {
    const affirmed =
      Boolean((meta as { terms_accepted_at?: string }).terms_accepted_at) ||
      searchParams.get('accepted') === '1'
    if (affirmed) {
      const fwd = request.headers.get('x-forwarded-for')
      const { error: accErr } = await createServiceClient()
        .from('legal_acceptances')
        .insert({
          user_id: data.user.id,
          ip_address: fwd?.split(',')[0]?.trim() || null,
          user_agent: request.headers.get('user-agent'),
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          acceptance_context: 'signup',
        })
      // Deploy-order safety: table lands with migration 039.
      if (accErr) console.error('[callback] acceptance log failed:', accErr.message)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
