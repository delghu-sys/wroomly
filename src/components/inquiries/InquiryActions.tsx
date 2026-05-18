'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InquiryActionsProps {
  inquiryId: string
  consumerId: string
  listingId: string
  /** `'sublet' | 'swap'`. Swaps don't move money so they're never gated on payout setup. */
  listingType: 'sublet' | 'swap' | string
  /** Whether the supplier's Stripe Connect is fully active. */
  supplierPayoutReady: boolean
}

export function InquiryActions({
  inquiryId,
  // consumerId + listingId are no longer used directly (the server route
  // re-derives them from the inquiry row); kept in the prop signature so
  // callers don't need to change.
  consumerId: _consumerId,
  listingId: _listingId,
  listingType,
  supplierPayoutReady,
}: InquiryActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  async function dispatch(action: 'accept' | 'decline') {
    setLoading(action)
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Action failed.')
        return
      }
      toast.success(
        action === 'accept' ? 'Inquiry accepted!' : 'Inquiry declined.'
      )
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setLoading(null)
    }
  }

  const needsPayoutSetup = listingType === 'sublet' && !supplierPayoutReady

  if (needsPayoutSetup) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-ink-muted leading-snug max-w-[34ch]">
          Connect Stripe before accepting — that&rsquo;s where the rent
          lands.
        </p>
        <Link
          href="/payouts"
          className="
            inline-flex items-center gap-1.5 h-9 px-4 rounded-full
            text-[13px] font-semibold tracking-tight
            bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]
            shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
            hover:shadow-[0_10px_28px_oklch(0.84_0.17_85/0.45)]
            transition-shadow duration-500 active:scale-[0.97]
            focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]
          "
        >
          Set up payouts →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => dispatch('accept')}
        disabled={!!loading}
        className="press rounded-full bg-navy text-white hover:bg-navy/90"
      >
        {loading === 'accept' ? 'Accepting…' : 'Accept'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => dispatch('decline')}
        disabled={!!loading}
        className="press rounded-full text-destructive border-destructive/30 hover:bg-destructive/5"
      >
        {loading === 'decline' ? 'Declining…' : 'Decline'}
      </Button>
    </div>
  )
}
