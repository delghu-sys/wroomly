'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ListingWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PAYMENTS_ENABLED } from '@/lib/config'
import { CheckCircle2, CreditCard, MessageSquare, Send, Loader2 } from 'lucide-react'
import { PaperPlaneTilt, UserPlus } from '@phosphor-icons/react/dist/ssr'
import { InquiryModal } from './InquiryModal'
import { getListingImageUrl } from '@/lib/utils/listing'
import { MagneticLinkCta } from '@/components/brand/MagneticLinkCta'

interface InquiryFormProps {
  listing: ListingWithDetails
  authUser: { id: string } | null
  isOwner: boolean
  existingInquiry: { id: string; status: string } | null
  conversationId: string | null
  hasPaid?: boolean
}

/**
 * Conversational inquiry CTA panel for the listing detail sidebar.
 *
 * - Unauthenticated → directional-fill magnetic Sign-in CTA
 * - Owner → edit-listing button
 * - Existing inquiry → state-specific status panel
 * - No inquiry yet → magnetic "Send inquiry" button that opens the
 *   InquiryModal (morphing spring expand from button).
 */
export function InquiryForm({
  listing,
  authUser,
  isOwner,
  existingInquiry,
  conversationId,
  hasPaid,
}: InquiryFormProps) {
  const [paying, setPaying] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const coverImage = listing.listing_images
    ?.slice()
    .sort((a, b) => a.display_order - b.display_order)
    .at(0)
  const thumbnailUrl = coverImage ? getListingImageUrl(coverImage.storage_path) : null

  // ── Owner state ──
  if (isOwner) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-ink-muted mb-3">This is your listing</p>
        <Link href={`/listings/${listing.id}/edit`} className="block">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full border-line hover:border-[oklch(0.84_0.17_85/0.50)] transition-all duration-300 active:scale-[0.98]"
          >
            Edit listing
          </Button>
        </Link>
      </div>
    )
  }

  // ── Unauthenticated ──
  if (!authUser) {
    return (
      <div className="space-y-3">
        <MagneticLinkCta
          href={`/sign-in?next=/listings/${listing.id}`}
          variant="primary"
          icon={<PaperPlaneTilt size={16} weight="fill" className="-rotate-12" />}
        >
          Sign in to inquire
        </MagneticLinkCta>
        <MagneticLinkCta
          href="/sign-up"
          variant="ghost"
          size="sm"
          icon={<UserPlus size={15} weight="duotone" />}
        >
          Create account
        </MagneticLinkCta>
        <p className="pt-1 text-[11.5px] text-ink-muted text-center leading-relaxed">
          Inquiries open a private chat — no commitment until both sides agree.
        </p>
      </div>
    )
  }

  async function startCheckout() {
    if (paying) return
    setPaying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout')
        setPaying(false)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Could not start checkout')
      setPaying(false)
    }
  }

  // ── Existing inquiry: accepted (sublet) ──
  if (existingInquiry?.status === 'accepted' && listing.type === 'sublet') {
    if (hasPaid) {
      return (
        <div
          className="rounded-2xl p-4 space-y-3 border"
          style={{
            background: 'oklch(0.55 0.15 142 / 0.12)',
            borderColor: 'oklch(0.55 0.15 142 / 0.35)',
          }}
        >
          <div className="flex items-center justify-center gap-2 font-medium" style={{ color: 'oklch(0.40 0.13 142)' }}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-display text-lg">Booking confirmed</p>
          </div>
          <p className="text-sm text-ink-soft text-center">
            You&rsquo;ve paid for this place. You&rsquo;re all set.
          </p>
          {conversationId && (
            <Link href={`/messages/${conversationId}`} className="block">
              <Button className="w-full h-11 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.22_0.075_256)]/90 transition-all duration-300 active:scale-[0.98]">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message your host
              </Button>
            </Link>
          )}
        </div>
      )
    }
    return (
      <div
        className="rounded-2xl p-4 space-y-3 border"
        style={{
          background: 'oklch(0.55 0.15 142 / 0.10)',
          borderColor: 'oklch(0.55 0.15 142 / 0.35)',
        }}
      >
        <div>
          <p className="font-display text-lg text-ink">Inquiry accepted</p>
          <p className="text-sm text-ink-soft mt-0.5">
            {PAYMENTS_ENABLED
              ? 'Confirm your booking to lock in this place.'
              : "You're connected — arrange the details with your host in chat."}
          </p>
        </div>
        {PAYMENTS_ENABLED && (
          <Button
            onClick={startCheckout}
            disabled={paying}
            className="
              group relative w-full h-11 rounded-full overflow-hidden
              bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]
              font-semibold
              shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
              hover:shadow-[0_10px_28px_oklch(0.84_0.17_85/0.45)]
              transition-shadow duration-500 active:scale-[0.98]
            "
          >
            <span className="absolute inset-0 bg-[oklch(0.22_0.075_256)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 inline-flex items-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paying ? 'Redirecting…' : 'Pay now'}
            </span>
          </Button>
        )}
        {conversationId && (
          <Link href={`/messages/${conversationId}`} className="block">
            <Button
              className={
                PAYMENTS_ENABLED
                  ? 'w-full h-11 rounded-full border-line hover:border-[oklch(0.84_0.17_85/0.50)] transition-all duration-300 active:scale-[0.98]'
                  : 'w-full h-11 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.22_0.075_256)]/90 transition-all duration-300 active:scale-[0.98]'
              }
              variant={PAYMENTS_ENABLED ? 'outline' : 'default'}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Open chat
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // ── Existing inquiry: accepted (swap) ──
  if (existingInquiry?.status === 'accepted') {
    return (
      <div
        className="rounded-2xl p-4 space-y-3 border"
        style={{
          background: 'oklch(0.55 0.15 142 / 0.10)',
          borderColor: 'oklch(0.55 0.15 142 / 0.35)',
        }}
      >
        <div>
          <p className="font-display text-lg text-ink">Swap accepted</p>
          <p className="text-sm text-ink-soft mt-0.5">
            Coordinate the swap details in chat.
          </p>
        </div>
        {conversationId && (
          <Link href={`/messages/${conversationId}`} className="block">
            <Button className="w-full h-11 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.22_0.075_256)]/90 transition-all duration-300 active:scale-[0.98]">
              <MessageSquare className="w-4 h-4 mr-2" />
              Open chat
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // ── Existing inquiry: pending ──
  if (existingInquiry?.status === 'pending') {
    return (
      <div className="rounded-2xl p-4 space-y-3 border border-line bg-[oklch(0.97_0.008_75)]">
        <div>
          <p className="font-display text-lg text-ink">Inquiry sent</p>
          <p className="text-sm text-ink-soft mt-0.5">
            The supplier will review and respond in chat.
          </p>
        </div>
        {conversationId && (
          <Link href={`/messages/${conversationId}`} className="block">
            <Button className="w-full h-11 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.22_0.075_256)]/90 transition-all duration-300 active:scale-[0.98]">
              <MessageSquare className="w-4 h-4 mr-2" />
              Open chat
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // ── Existing inquiry: rejected / withdrawn ──
  if (existingInquiry) {
    return (
      <div className="rounded-2xl p-4 text-center border border-line bg-[oklch(0.97_0.008_75)]">
        <p className="font-display text-lg text-ink">
          {existingInquiry.status === 'rejected'
            ? 'Inquiry not accepted'
            : 'Inquiry withdrawn'}
        </p>
        <p className="text-sm text-ink-muted mt-1">
          {existingInquiry.status === 'rejected'
            ? 'The supplier did not accept this inquiry.'
            : 'You withdrew this inquiry.'}
        </p>
      </div>
    )
  }

  // ── No inquiry yet → magnetic CTA opens InquiryModal ──
  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="
            group relative w-full h-12 rounded-full overflow-hidden
            bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]
            font-semibold text-sm tracking-tight
            shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
            hover:shadow-[0_10px_28px_oklch(0.84_0.17_85/0.45)]
            transition-all duration-300 active:scale-[0.98]
          "
        >
          <span className="absolute inset-0 bg-[oklch(0.22_0.075_256)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
          <span className="relative z-10 inline-flex items-center justify-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
            <Send className="w-4 h-4 -rotate-12" strokeWidth={2.25} />
            Send inquiry
          </span>
        </button>
        <p className="text-xs text-ink-muted text-center leading-relaxed">
          Opens a chat with the supplier — no commitment.
        </p>
      </div>

      <InquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        listing={{
          id: listing.id,
          title: listing.title,
          type: listing.type,
          price_per_month: listing.price_per_month,
          available_from: listing.available_from,
          available_to: listing.available_to,
          supplier_id: listing.supplier_id,
          thumbnailUrl,
          source: listing.source,
          source_name: listing.source_name,
        }}
        authUserId={authUser.id}
      />
    </>
  )
}
