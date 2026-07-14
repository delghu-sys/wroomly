'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SealCheck, House } from '@phosphor-icons/react/dist/ssr'

/**
 * Shown at /listings/new when a supplier isn't UMich-verified. Listing requires
 * the blue check (RLS + server enforce it), so instead of a cryptic failure we
 * ask them to verify by linking their UMich Google account. On return the auth
 * callback confirms the @umich.edu identity and upgrades is_verified.
 *
 * Uses linkIdentity (not signInWithOAuth) so a user who joined with email or a
 * personal Google keeps the same account and just adds the UMich identity.
 */
export function VerifyToListPrompt() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function verify() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/callback?next=${encodeURIComponent('/listings/new')}`
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, queryParams: { hd: 'umich.edu', prompt: 'select_account' } },
    })
    if (error) {
      setError(
        error.message ||
          'Could not start UMich verification. Please try again, or sign up fresh with your UMich Google.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div
        className="relative rounded-3xl overflow-hidden border border-line bg-white/85 backdrop-blur-xl p-8 sm:p-10"
        style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 18px 50px oklch(0 0 0 / 0.06)' }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl opacity-30"
          style={{ background: 'oklch(0.55 0.22 264 / 0.30)' }}
          aria-hidden
        />
        <div className="relative">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center"
            style={{ background: 'oklch(0.22 0.075 256)', color: '#2F6BFF' }}
          >
            <House size={22} weight="duotone" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] mt-6">
            Verify to{' '}
            <span className="italic font-light text-[#2F6BFF]">list your place.</span>
          </h1>

          <p className="mt-4 text-ink-soft leading-relaxed max-w-[55ch]">
            Every listing on Wroomly comes from a verified University of Michigan
            student — that&rsquo;s the whole point, and it&rsquo;s why renters
            trust the place. Sign in with your <strong>@umich.edu</strong> Google
            account to get your blue check and start listing.
          </p>

          <button
            type="button"
            onClick={verify}
            disabled={loading}
            className="mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#2F6BFF] text-white font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-60 active:scale-[0.98]"
          >
            <SealCheck size={18} weight="fill" />
            {loading ? 'Redirecting…' : 'Verify with UMich Google'}
          </button>

          {error && <p className="mt-3 text-[13px] text-[oklch(0.55_0.20_25)]">{error}</p>}

          <p className="mt-6 text-[13px] text-ink-muted">
            Not a UMich student?{' '}
            <Link href="/listings" className="underline underline-offset-2 hover:text-ink">
              Browse listings
            </Link>{' '}
            instead — anyone can search and inquire.
          </p>
        </div>
      </div>
    </div>
  )
}
