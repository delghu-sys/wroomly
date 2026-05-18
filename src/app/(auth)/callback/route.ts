import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // Supabase sets this for recovery flows
  const rawNext = searchParams.get('next') ?? '/dashboard'

  // Prevent open redirect — only allow relative paths, not protocol-relative URLs.
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=Could%20not%20verify%20email`
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=Could%20not%20verify%20email`
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

  // Server-side enforcement: `user_type` claim is only accepted if
  //  (a) it's not `admin` (you don't make yourself admin via signup), and
  //  (b) for `supplier`, the verified email is actually on the U-M domain.
  // Otherwise we coerce to `consumer`.
  const claimedType = meta.user_type === 'supplier' ? 'supplier' : 'consumer'
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
      full_name: meta.full_name ?? null,
      university: meta.university ?? null,
      user_type: effectiveType,
      is_verified: true,
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
