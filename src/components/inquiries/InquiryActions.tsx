'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InquiryActionsProps {
  inquiryId: string
  consumerId: string
  listingId: string
  /**
   * `'sublet' | 'swap'`. Swaps don't move money so they're never gated
   * on payout setup; sublet acceptance is blocked until the supplier
   * has finished Stripe Connect.
   */
  listingType: 'sublet' | 'swap' | string
  /** Whether the supplier's Stripe Connect is fully active. */
  supplierPayoutReady: boolean
}

export function InquiryActions({
  inquiryId,
  consumerId,
  listingId,
  listingType,
  supplierPayoutReady,
}: InquiryActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)

  async function handleAction(action: 'accepted' | 'rejected') {
    setLoading(action === 'accepted' ? 'accept' : 'reject')
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: action })
      .eq('id', inquiryId)

    if (updateError) {
      toast.error('Action failed. Please try again.')
      setLoading(null)
      return
    }

    if (action === 'accepted') {
      const { data: { user } } = await supabase.auth.getUser()

      // Find the conversation (created automatically when consumer sent the inquiry)
      let { data: convo } = await supabase
        .from('conversations')
        .select('id, listings(title, type, price_per_month)')
        .eq('inquiry_id', inquiryId)
        .maybeSingle()

      // Fallback: create one if it doesn't exist (legacy inquiries from before auto-create)
      if (!convo && user) {
        const { data: created } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId,
            supplier_id: user.id,
            consumer_id: consumerId,
            inquiry_id: inquiryId,
          })
          .select('id, listings(title, type, price_per_month)')
          .single()
        convo = created
      }

      if (convo && user) {
        const listing = (convo as unknown as {
          listings: { title: string | null; type: string | null; price_per_month: number | null } | null
        }).listings
        const payload = JSON.stringify({
          title: listing?.title ?? '',
          type: listing?.type ?? 'sublet',
          price: listing?.price_per_month ?? 0,
          listing_id: listingId,
        })
        await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: user.id,
          content: `::deal_accepted::${payload}`,
        })
        toast.success('Inquiry accepted!')
        router.push(`/messages/${convo.id}`)
      } else {
        toast.success('Inquiry accepted!')
        router.push('/messages')
      }
    } else {
      toast.success('Inquiry rejected.')
    }

    router.refresh()
    setLoading(null)
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
        onClick={() => handleAction('accepted')}
        disabled={!!loading}
        className="press rounded-full bg-navy text-white hover:bg-navy/90"
      >
        {loading === 'accept' ? 'Accepting…' : 'Accept'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('rejected')}
        disabled={!!loading}
        className="press rounded-full text-destructive border-destructive/30 hover:bg-destructive/5"
      >
        {loading === 'reject' ? 'Declining…' : 'Decline'}
      </Button>
    </div>
  )
}
