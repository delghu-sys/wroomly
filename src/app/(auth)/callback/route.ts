import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // Supabase sets this for recovery flows
  const rawNext = searchParams.get('next') ?? '/dashboard'

  // Prevent open redirect — allow only same-origin relative paths. Rejects
  // protocol-relative ("//evil.com") and backslash-bypass ("/\evil.com",
  // which browsers normalize toward "//evil.com") forms.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : '/dashboard'

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

  // Server-side enforcement: `user_type` claim is only accepted if
  //  (a) it's not `admin` (you don't make yourself admin via signup), and
  //  (b) for `supplier`, the verified email is actually on the U-M domain.
  // Otherwise we coerce to `consumer`.
  const claimedType = claimedRaw === 'supplier' ? 'supplier' : 'consumer'
  const emailIsUmich =
    data.user.email?.toLowerCase().endsWith(`@${UMICH_EMAIL_DOMAIN}`) ?? false
  const effectiveType =
    claimedType === 'supplier' && !emailIsUmich ? 'consumer' : claimedType

  // Critical: only create a `users` row on first login. NEVER overwrite an
  // existing row's `user_type` — that would silently demote admins back to
  // consumer on their next OAuth refresh.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email!,
      full_name: googleName,
      university: meta.university ?? null,
      user_type: effectiveType,
      is_verified: true,
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
