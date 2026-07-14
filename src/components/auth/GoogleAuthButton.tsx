'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Official Google "G" mark. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

interface GoogleAuthButtonProps {
  /** Button label, e.g. "Continue with Google" / "Sign up with Google". */
  label?: string
  /**
   * Role the user is signing up as. Carried to /callback via the redirect so a
   * brand-new account is created with the right `user_type`. Omit for sign-in
   * (existing users keep their type; new ones default to consumer).
   */
  intendedType?: 'supplier' | 'consumer'
  /** Where to land after auth (already sanitized by the caller). */
  next?: string
  disabled?: boolean
  /** Surface an OAuth-initiation error to the parent form. */
  onError?: (message: string) => void
  /**
   * When true, hint Google to the umich.edu workspace (`hd=umich.edu`) so the
   * account chooser prefers a UMich login. This is the verification path — the
   * server still confirms the returned account is @umich.edu before granting
   * the badge; the hint is UX only, never the enforcement.
   */
  umich?: boolean
}

/**
 * "Continue with Google" button. Kicks off Supabase OAuth (PKCE) in the
 * browser; the user is bounced to Google and returns to /callback, which
 * exchanges the code and creates the `users` row on first login.
 */
export function GoogleAuthButton({
  label = 'Continue with Google',
  intendedType,
  next = '/',
  disabled = false,
  onError,
  umich = false,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    onError?.('')
    const supabase = createClient()

    const params = new URLSearchParams()
    if (intendedType) params.set('intended_type', intendedType)
    if (next) params.set('next', next)
    const redirectTo = `${window.location.origin}/callback?${params.toString()}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: umich
          ? { prompt: 'select_account', hd: 'umich.edu' }
          : { prompt: 'select_account' },
      },
    })

    if (error) {
      onError?.(error.message)
      setLoading(false)
    }
    // On success the browser navigates away to Google — nothing more to do.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="group w-full h-12 rounded-full border border-line bg-white text-ink font-semibold text-sm tracking-tight inline-flex items-center justify-center gap-2.5 transition-all duration-300 hover:bg-[oklch(0.98_0.005_85)] hover:shadow-[0_4px_18px_oklch(0_0_0/0.06)] disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleG />}
      {loading ? 'Redirecting…' : label}
    </button>
  )
}
