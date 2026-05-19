'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import {
  CalendarBlank,
  ShieldCheck,
  ArrowsLeftRight as ArrowsLeftRightPh,
} from '@phosphor-icons/react/dist/ssr'
import { format, parseISO } from 'date-fns'
import { formatCents } from '@/lib/utils/listing'
import { InquiryForm } from './InquiryForm'
import { Button } from '@/components/ui/button'
import { FeeNote } from '@/components/brand/FeeNote'
import type { ListingWithDetails } from '@/types/database'

interface BookingSidebarProps {
  listing: ListingWithDetails
  authUser: { id: string } | null
  isOwner: boolean
  existingInquiry: { id: string; status: string } | null
  conversationId: string | null
  hasPaid: boolean
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export function BookingSidebar({
  listing,
  authUser,
  isOwner,
  existingInquiry,
  conversationId,
  hasPaid,
}: BookingSidebarProps) {
  // "Closed" suppresses the inquiry/payment CTAs and shows a generic
  // "no longer available" message. Skip it when the current viewer is
  // the consumer who paid — they should see the InquiryForm's "Booking
  // confirmed" state with a link back to their host chat, not a stark
  // "this place has been rented" message that reads as if they lost it.
  const closed =
    (listing.status === 'rented' || listing.status === 'swapped') && !hasPaid

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      // Cap height to the viewport minus the sticky offset + a small gap;
      // overflow-y:auto inside lets the sidebar scroll independently when
      // the inquiry form + price stack + trust line exceed available space
      // (which happens at common laptop heights). Without this the submit
      // button is unreachable on shorter screens.
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl"
    >
      <div
        className="relative rounded-3xl overflow-hidden border border-line bg-white/85 backdrop-blur-xl"
        style={{
          boxShadow:
            'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 28px 70px oklch(0.84 0.17 85 / 0.22), 0 8px 24px oklch(0.10 0.02 260 / 0.06)',
        }}
      >
        {/* Subtle gold mesh */}
        <div
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-35"
          style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: 'oklch(0.45 0.10 280 / 0.30)' }}
          aria-hidden
        />

        <div className="relative p-6 space-y-5">
          {closed ? (
            <div className="rounded-2xl p-5 text-center bg-[oklch(0.97_0.04_25)] border border-[oklch(0.85_0.10_25)]">
              <p className="font-display text-xl text-ink leading-tight">
                {listing.status === 'rented' ? 'This place has been rented' : 'This swap is complete'}
              </p>
              <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                This listing is no longer available.
              </p>
              {existingInquiry?.status === 'accepted' && conversationId && (
                <Link href={`/messages/${conversationId}`} className="block mt-4">
                  <Button className="w-full h-11 rounded-full bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.10_0.02_260)]/90 transition-all duration-300 active:scale-[0.98]">
                    Open chat
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Price block — display font */}
              {listing.type === 'sublet' && listing.price_per_month && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-1.5">
                    From
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <p
                      className="font-display tracking-tight leading-none"
                      style={{
                        color: 'oklch(0.10 0.02 260)',
                        fontSize: 'clamp(2.5rem, 5.5vw, 3.25rem)',
                      }}
                    >
                      {formatCents(listing.price_per_month)}
                    </p>
                    <span className="font-sans text-base font-normal text-ink-muted">
                      /mo
                    </span>
                  </div>
                  {listing.deposit_amount && (
                    <p className="text-[12.5px] text-ink-muted mt-2">
                      + {formatCents(listing.deposit_amount)} deposit
                    </p>
                  )}
                  <p className="mt-2">
                    <FeeNote variant="inline" />
                  </p>
                  {/* Wroomly handles the first month + deposit. After that
                      the consumer arranges payment with the host directly.
                      Setting expectation here avoids a "where's my month
                      2?" support ticket post-booking. */}
                  <p className="text-[11.5px] text-ink-muted leading-snug mt-3 pt-3 border-t border-line/60">
                    Wroomly charges your first month + deposit at booking.
                    You&rsquo;ll pay your host directly for months 2 onward.
                  </p>
                </div>
              )}

              {listing.type === 'swap' && (
                <div className="rounded-2xl p-4 border border-[oklch(0.84_0.17_85/0.40)] bg-[oklch(0.84_0.17_85/0.08)]">
                  <p className="font-display font-semibold text-[oklch(0.10_0.02_260)] flex items-center gap-2 text-lg tracking-tight">
                    <ArrowsLeftRightPh size={16} weight="bold" />
                    Housing swap
                  </p>
                  <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                    No money changes hands — you swap your place for theirs.
                  </p>
                </div>
              )}

              {/* Date range — clean formatted strip */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[oklch(0.97_0.008_75)] border border-line">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'oklch(0.10 0.02 260)',
                    color: 'oklch(0.84 0.17 85)',
                  }}
                >
                  <CalendarBlank size={16} weight="duotone" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold">
                    Available
                  </p>
                  <p className="font-display text-sm tracking-tight text-ink mt-0.5">
                    {format(parseISO(listing.available_from), 'MMM d')} —{' '}
                    {format(parseISO(listing.available_to), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <InquiryForm
                listing={listing}
                authUser={authUser}
                isOwner={isOwner}
                existingInquiry={existingInquiry}
                conversationId={conversationId}
                hasPaid={hasPaid}
              />

              {/* Stripe trust line */}
              {listing.type === 'sublet' && (
                <div className="pt-3 mt-1 flex items-center justify-center gap-1.5 border-t border-line/70">
                  <ShieldCheck
                    size={13}
                    weight="duotone"
                    className="text-[oklch(0.45_0.13_85)] shrink-0"
                  />
                  <p className="text-[11.5px] text-ink-muted leading-snug tracking-tight">
                    Secure payments via{' '}
                    <span className="font-semibold text-ink-soft">Stripe</span>
                    {' '}— rent held in escrow until move-in.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
