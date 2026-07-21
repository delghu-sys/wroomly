'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SealCheck, X } from '@phosphor-icons/react/dist/ssr'

/**
 * Optional, dismissible nudge shown above the listing wizard for suppliers who
 * aren't UMich-verified. Listing is open to everyone — this only encourages
 * verification so their listing carries the blue check (renters trust verified
 * listings more). Never blocks. Uses linkIdentity so an account that joined
 * with email / a personal Google keeps the same account and adds the UMich
 * identity; the auth callback confirms @umich.edu and upgrades is_verified.
 */
export function VerifyBadgeNudge() {
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

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
      setError(error.message || 'Could not start verification. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative mb-8 rounded-2xl border border-[#2F6BFF]/25 bg-[oklch(0.55_0.22_264/0.06)] px-5 py-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-ink-muted hover:text-ink transition"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <SealCheck size={22} weight="fill" style={{ color: '#2F6BFF' }} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-ink text-[14.5px]">
            Add the blue check to your listing
          </p>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-0.5">
            You can list either way — but verifying with your{' '}
            <strong>@umich.edu</strong> Google account puts a{' '}
            <span className="text-[#2F6BFF] font-semibold">UMich verified</span>{' '}
            check next to your name, so renters can see your listing is from a
            real UMich student.
          </p>
          <button
            type="button"
            onClick={verify}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#2F6BFF] text-white font-semibold text-[13px] transition-all hover:brightness-110 disabled:opacity-60 active:scale-[0.98]"
          >
            <SealCheck size={15} weight="fill" />
            {loading ? 'Redirecting…' : 'Verify with UMich Google'}
          </button>
          {error && <p className="mt-2 text-[12px] text-[oklch(0.55_0.20_25)]">{error}</p>}
        </div>
      </div>
    </div>
  )
}
