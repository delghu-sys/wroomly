import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ATTRIBUTION_COOKIE, sanitizeSource } from '@/lib/attribution'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal'
import { UMICH } from '@/lib/constants'
import { computeVerification } from '@/lib/auth/umich-verification'

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
  // Verification is decided from SERVER-OWNED identity data only (the Google
  // `hd` + `email_verified` claims GoTrue wrote from the validated ID token),
  // never from the email string or user_metadata. See computeVerification.
  //
  // The session `data.user` from exchangeCodeForSession does not reliably carry
  // identity_data.custom_claims, so we re-read the authoritative user via the
  // service role. This is also what lets verification be a WRITE the user's own
  // session can't perform — the whole point, since an authenticated session can
  // self-INSERT its own row (RLS only stops it setting is_verified now).
  const service = createServiceClient()
  const { data: authoritative } = await service.auth.admin.getUserById(data.user.id)
  const verification = computeVerification(authoritative?.user ?? data.user)
  const isUmichSso = verification.isVerified

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

    // First-login row creation runs under the SERVICE role. is_verified and
    // verification_method are trust columns the user's own session must never
    // write (RLS + column grants now forbid it — migration 041), so the row is
    // created server-side with the verification computed above baked in.
    const row = {
      id: data.user.id,
      email: data.user.email!,
      full_name: googleName,
      // A verified UMich SSO session tells us the university even though Google
      // OAuth carries no signup metadata. Otherwise fall back to what the email
      // form supplied (only ever set for non-UMich, since UMich must use SSO).
      university: meta.university ?? verification.university,
      user_type: effectiveType,
      is_verified: verification.isVerified,
      signup_source: signupSource,
      verification_method: verification.method,
    }
    const { error: e1 } = await service.from('users').insert(row)
    if (e1) console.error('[callback] user insert failed:', e1.message)
  } else {
    // Returning login — reconcile the SSO badge with the current identity, both
    // ways, under the SERVICE role (the session can't write these columns):
    //
    //  • GRANT: an account that joined by email or non-UMich Google and has now
    //    linked/logged-in with UMich Google earns the check (the "verify later"
    //    path).
    //  • REVOKE: an account whose badge came from SSO but no longer has the
    //    qualifying identity (unlinked, or Google dropped the Workspace member)
    //    loses it. Revocation is scoped to verification_method='umich_sso' so a
    //    legacy @umich.edu account is never stripped by an SSO check it never
    //    used.
    //
    // A UMich SSO session never overwrites user_type or other fields.
    if (isUmichSso) {
      const { error: grantErr } = await service
        .from('users')
        .update({ is_verified: true, verification_method: 'umich_sso' })
        .eq('id', data.user.id)
        .eq('is_verified', false)
      if (grantErr) console.error('[callback] verification grant failed:', grantErr.message)

      // Fill a blank university for a freshly-granted SSO account; never
      // overwrite a value the user typed.
      const { error: uniErr } = await service
        .from('users')
        .update({ university: UMICH })
        .eq('id', data.user.id)
        .is('university', null)
      if (uniErr) console.error('[callback] university backfill failed:', uniErr.message)
    } else {
      const { error: revokeErr } = await service
        .from('users')
        .update({ is_verified: false, verification_method: null })
        .eq('id', data.user.id)
        .eq('verification_method', 'umich_sso')
      if (revokeErr) console.error('[callback] verification revoke failed:', revokeErr.message)
    }
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
