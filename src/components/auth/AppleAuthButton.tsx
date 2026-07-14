'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * "Continue with Apple" — non-UMich sign-in option.
 *
 * Renders ONLY when NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true'. Apple sign-in
 * needs an Apple Developer account ($99/yr) + a Service ID / key configured in
 * BOTH the Apple Developer portal and the Supabase Auth dashboard. Until that's
 * done the button would just error, so it stays hidden behind the flag. Flip the
 * env var on once the provider is configured. Never earns the UMich badge —
 * verification is Google @umich.edu SSO only.
 */
export function AppleAuthButton({
  intendedType,
  next = '/',
  onError,
}: {
  intendedType?: 'supplier' | 'consumer'
  next?: string
  onError?: (message: string) => void
}) {
  const [loading, setLoading] = useState(false)

  if (process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED !== 'true') return null

  async function handleClick() {
    setLoading(true)
    onError?.('')
    const supabase = createClient()
    const params = new URLSearchParams()
    if (intendedType) params.set('intended_type', intendedType)
    if (next) params.set('next', next)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/callback?${params.toString()}` },
    })
    if (error) {
      onError?.(error.message)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="group w-full h-12 rounded-full border border-line bg-black text-white font-semibold text-sm tracking-tight inline-flex items-center justify-center gap-2.5 transition-all duration-300 hover:bg-[#111] disabled:opacity-60 active:scale-[0.98]"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 12.04c-.03-2.7 2.2-4 2.3-4.06-1.25-1.84-3.2-2.09-3.9-2.12-1.66-.17-3.24.98-4.08.98-.84 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.08 1.35 10.72.9 1.3 1.97 2.75 3.38 2.7 1.36-.06 1.87-.88 3.51-.88 1.64 0 2.1.88 3.53.85 1.46-.03 2.38-1.32 3.27-2.62 1.03-1.5 1.46-2.96 1.48-3.04-.03-.01-2.84-1.09-2.87-4.32M14.4 4.2c.74-.9 1.24-2.15 1.1-3.4-1.07.04-2.36.71-3.13 1.6-.69.8-1.29 2.07-1.13 3.29 1.19.09 2.42-.61 3.16-1.49" />
        </svg>
      )}
      {loading ? 'Redirecting…' : 'Continue with Apple'}
    </button>
  )
}
