'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ConnectStatus } from '@/lib/stripe'

interface ConnectStripeButtonProps {
  status: ConnectStatus
  /**
   * `solid`   — full maize CTA. Default for the primary `/payouts` slot.
   * `ghost`   — outlined button for inline use (banners, accept gates).
   */
  variant?: 'solid' | 'ghost'
  /** Compact mode for narrow contexts. */
  size?: 'md' | 'sm'
}

/**
 * Maize-branded entry point to Stripe Connect Express. Routes the user
 * to either onboarding (none / incomplete) or their Express dashboard
 * (active) depending on `status`. State + label are driven by the
 * server-fetched ConnectStatus so the UI never lies about readiness.
 */
export function ConnectStripeButton({
  status,
  variant = 'solid',
  size = 'md',
}: ConnectStripeButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isActive = status === 'active'

  async function go() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isActive ? 'dashboard' : 'onboard',
        }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error ?? 'Could not start Stripe — please try again.')
        setLoading(false)
        router.refresh()
      }
    } catch {
      toast.error('Network error — please try again.')
      setLoading(false)
    }
  }

  const label =
    status === 'active'
      ? 'Open Stripe dashboard'
      : status === 'incomplete'
        ? 'Finish payout setup'
        : 'Connect payouts'

  const hCls = size === 'sm' ? 'h-10 text-[13px]' : 'h-11 text-sm'

  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-full overflow-hidden font-semibold tracking-tight transition-shadow duration-500 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)] disabled:opacity-60 disabled:cursor-not-allowed'

  const solid =
    'px-5 bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)] shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)] hover:shadow-[0_12px_32px_oklch(0.84_0.17_85/0.45)]'

  const ghost =
    'px-4 bg-white border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.40)] hover:text-ink'

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className={`${base} ${hCls} ${variant === 'solid' ? solid : ghost}`}
    >
      {variant === 'solid' && (
        <span
          className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ background: 'oklch(0.10 0.02 260)' }}
          aria-hidden
        />
      )}
      <span
        className={`relative z-10 inline-flex items-center gap-2 transition-colors duration-500 ${
          variant === 'solid' ? 'group-hover:text-[oklch(0.84_0.17_85)]' : ''
        }`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Opening Stripe…' : label}
      </span>
    </button>
  )
}
