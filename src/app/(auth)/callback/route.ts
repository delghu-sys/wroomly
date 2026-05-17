import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Prevent open redirect — only allow relative paths, not protocol-relative URLs.
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const meta = data.user.user_metadata as {
        full_name?: string
        university?: string
        user_type?: 'supplier' | 'consumer'
      }

      // Server-side enforcement: a `supplier` claim is only accepted if the
      // verified email actually belongs to the U-of-M domain. The client form
      // validates this too (zod refine), but trusting that alone means anyone
      // can sign up as a supplier by editing the user_metadata payload.
      const claimedType = meta.user_type ?? 'consumer'
      const emailIsUmich =
        data.user.email?.toLowerCase().endsWith(`@${UMICH_EMAIL_DOMAIN}`) ?? false
      const effectiveType =
        claimedType === 'supplier' && !emailIsUmich ? 'consumer' : claimedType

      await supabase.from('users').upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: meta.full_name ?? null,
          university: meta.university ?? null,
          user_type: effectiveType,
          is_verified: true,
        },
        { onConflict: 'id' }
      )

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=Could%20not%20verify%20email`
  )
}
