import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ATTRIBUTION_COOKIE, sanitizeSource } from '@/lib/attribution'

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

    const row = {
      id: data.user.id,
      email: data.user.email!,
      full_name: googleName,
      university: meta.university ?? null,
      user_type: effectiveType,
      // Only a real UMich Google SSO login earns the badge (see above).
      is_verified: isUmichSso,
      verification_method: isUmichSso ? 'umich_sso' : null,
    }

    // Deploy-order safety: if this code ships before migration 030 is
    // applied, inserting signup_source would fail on the missing column and
    // break every new signup. Attribution is never worth that — retry bare.
    const { error: insertError } = await supabase
      .from('users')
      .insert({ ...row, signup_source: signupSource })
    if (insertError) {
      console.warn('[callback] insert with signup_source failed, retrying bare:', insertError.message)
      await supabase.from('users').insert(row)
    }
  } else if (isUmichSso) {
    // Returning login that IS a UMich SSO session — upgrade an existing
    // unverified account to verified (the "verify to list" path: a user who
    // joined with email or a non-umich Google later links/logs-in with their
    // UMich Google account). Only ever an upgrade; a normal re-login never
    // strips verification, and user_type/other fields are untouched.
    await supabase
      .from('users')
      .update({ is_verified: true, verification_method: 'umich_sso' })
      .eq('id', data.user.id)
      .eq('is_verified', false)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
