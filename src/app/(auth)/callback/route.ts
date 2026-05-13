import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create user profile if it doesn't exist
      const meta = data.user.user_metadata
      await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email!,
        full_name: meta.full_name ?? null,
        university: meta.university ?? null,
        user_type: meta.user_type ?? 'consumer',
        is_verified: true,
      }, { onConflict: 'id' })

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=Could not verify email`)
}
