'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Calendar, BedDouble, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Warning, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import type { InquiryStatus } from '@/types/database'
import { formatCents } from '@/lib/utils/listing'
import Image from 'next/image'

interface InquiryPinnedCardProps {
  inquiry: {
    id: string
    message: string
    move_in_date: string | null
    move_out_date: string | null
    status: InquiryStatus
    consumer_id: string
  }
  listing: {
    id: string
    title: string
    type: string
    price_per_month: number | null
    available_from: string | null
    available_to: string | null
    thumbnailUrl: string | null
  }
  isSupplier: boolean
  /**
   * Server-evaluated readiness of the supplier's Stripe Connect account.
   * Sublet inquiries can't be accepted while this is false — there's
   * nowhere for the rent to land. Defaults to `true` so swap inquiries
   * (no money flow) and legacy callers aren't broken.
   */
  supplierPayoutReady?: boolean
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }
const bouncySpring = { type: 'spring' as const, stiffness: 200, damping: 14 }

export function InquiryPinnedCard({
  inquiry,
  listing,
  isSupplier,
  supplierPayoutReady = true,
}: InquiryPinnedCardProps) {
  const router = useRouter()
  // Sublet bookings move real money; require an active Stripe Connect
  // account before letting the supplier accept. Swaps are exempt — no
  // funds flow through Wroomly.
  const needsPayoutSetup = listing.type === 'sublet' && !supplierPayoutReady
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status)
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const [showBurst, setShowBurst] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  async function decide(next: 'accepted' | 'rejected') {
    if (loading) return
    setLoading(next === 'accepted' ? 'accept' : 'reject')

    // Server route enforces supplier ownership + payout-ready check + posts
    // the ::deal_accepted:: system message. Browser doesn't get to write
    // directly anymore.
    let okResponse = false
    let serverError: string | null = null
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: next === 'accepted' ? 'accept' : 'decline',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        serverError = data.error ?? 'Action failed. Please try again.'
      } else {
        okResponse = true
      }
    } catch {
      serverError = 'Network error — please try again.'
    }

    if (!okResponse) {
      toast.error(serverError ?? 'Action failed. Please try again.')
      setLoading(null)
      return
    }

    if (next === 'accepted' && !prefersReducedMotion) {
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 1200)
    }

    setStatus(next)
    toast.success(
      next === 'accepted' ? 'Inquiry accepted' : 'Inquiry declined'
    )
    setLoading(null)
    router.refresh()
  }

  const move_in = inquiry.move_in_date ?? listing.available_from
  const move_out = inquiry.move_out_date ?? listing.available_to

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative rounded-3xl overflow-hidden border border-line bg-white/85 backdrop-blur-xl shadow-[0_4px_18px_oklch(0_0_0/0.05)]"
      style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 4px 18px oklch(0 0 0 / 0.05)' }}
    >
      {/* Glass refraction + maize accent corner */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-30"
        style={{ background: 'oklch(0.84 0.17 85 / 0.40)' }}
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Listing thumb */}
          <Link
            href={`/listings/${listing.id}`}
            className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-[oklch(0.95_0.01_85)] ring-1 ring-line"
          >
            {listing.thumbnailUrl ? (
              <Image
                src={listing.thumbnailUrl}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BedDouble className="w-6 h-6 text-ink-muted/40" />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-1">
              Inquiry
            </p>
            <Link
              href={`/listings/${listing.id}`}
              className="font-display text-lg sm:text-xl tracking-tight text-ink leading-tight hover:text-[oklch(0.45_0.13_85)] transition-colors line-clamp-1"
            >
              {listing.title}
            </Link>

            {/* Status pill */}
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        {/* Dates + price grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {move_in && move_out && (
            <div className="rounded-2xl px-3.5 py-3 border border-line bg-[oklch(0.97_0.008_75)]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-muted font-semibold">
                <Calendar className="w-3 h-3" strokeWidth={2} />
                Dates
              </div>
              <p className="font-display text-sm text-ink mt-1.5 tracking-tight">
                {format(parseISO(move_in), 'MMM d')} —{' '}
                {format(parseISO(move_out), 'MMM d')}
              </p>
            </div>
          )}
          {listing.type === 'sublet' && listing.price_per_month && (
            <div className="rounded-2xl px-3.5 py-3 border border-line bg-[oklch(0.97_0.008_75)]">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted font-semibold">
                Price
              </p>
              <p className="font-display text-sm text-ink mt-1.5 tracking-tight">
                {formatCents(listing.price_per_month)}
                <span className="text-ink-muted font-normal"> /mo</span>
              </p>
            </div>
          )}
        </div>

        {/* Message preview */}
        {inquiry.message && (
          <p className="mt-5 text-[14px] text-ink-soft leading-relaxed line-clamp-3 italic font-light">
            &ldquo;{inquiry.message}&rdquo;
          </p>
        )}

        {/* Supplier payout-not-ready gate. Sublet inquiries can't be
            accepted until the host has finished Stripe onboarding —
            otherwise there's nowhere for the rent to land. */}
        {isSupplier && status === 'pending' && needsPayoutSetup && (
          <div
            className="mt-5 rounded-2xl border p-4 flex items-start gap-3"
            style={{
              borderColor: 'oklch(0.84 0.17 85 / 0.40)',
              background: 'oklch(0.84 0.17 85 / 0.08)',
            }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'oklch(0.10 0.02 260)',
                color: 'oklch(0.84 0.17 85)',
              }}
            >
              <Warning size={16} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[oklch(0.32_0.10_85)]">
                Payout setup needed
              </p>
              <p className="text-[13.5px] text-ink-soft mt-0.5 leading-relaxed">
                Connect Stripe before accepting — that&rsquo;s where the rent
                lands. Takes about 5 minutes.
              </p>
              <Link
                href="/payouts"
                className="
                  inline-flex items-center gap-1.5 mt-3
                  text-[13px] font-semibold text-[oklch(0.32_0.10_85)]
                  underline-offset-4 hover:underline transition-colors
                "
              >
                Set up payouts <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        )}

        {/* Supplier actions */}
        {isSupplier && status === 'pending' && !needsPayoutSetup && (
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide('accepted')}
              disabled={!!loading}
              className="
                group relative inline-flex items-center justify-center gap-2
                h-11 px-5 rounded-full overflow-hidden flex-1
                font-semibold text-sm tracking-tight
                bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]
                shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
                hover:shadow-[0_10px_28px_oklch(0.84_0.17_85/0.45)]
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.97]
                transition-all duration-300
              "
            >
              <span className="absolute inset-0 bg-[oklch(0.10_0.02_260)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
              <span className="relative z-10 inline-flex items-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
                {loading === 'accept' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                )}
                {loading === 'accept' ? 'Accepting…' : 'Accept'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => decide('rejected')}
              disabled={!!loading}
              className="
                inline-flex items-center justify-center gap-2
                h-11 px-5 rounded-full border border-line bg-white text-ink-soft
                font-medium text-sm
                hover:border-[oklch(0.65_0.20_25/0.30)] hover:text-[oklch(0.55_0.20_25)]
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.97]
                transition-all duration-300
              "
            >
              {loading === 'reject' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" strokeWidth={2} />
              )}
              {loading === 'reject' ? 'Declining…' : 'Decline'}
            </button>
          </div>
        )}
      </div>

      {/* Confetti burst on accept */}
      <AnimatePresence>
        {showBurst && <ConfettiBurst />}
      </AnimatePresence>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  if (status === 'accepted') {
    return (
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={bouncySpring}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50 border-emerald-300/60 text-emerald-700"
      >
        <CheckCircle2 className="w-3 h-3" strokeWidth={2.25} />
        Accepted
      </motion.span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-red-50/60 border-red-200/60 text-red-700/80">
        <XCircle className="w-3 h-3" strokeWidth={2.25} />
        Declined
      </span>
    )
  }
  if (status === 'withdrawn') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-ink-muted/10 border-line text-ink-muted">
        Withdrawn
      </span>
    )
  }
  // pending — slow breathing pulse
  return (
    <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-[oklch(0.84_0.17_85/0.10)] border-[oklch(0.84_0.17_85/0.40)] text-[oklch(0.32_0.10_85)]">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-60"
          style={{ background: 'oklch(0.84 0.17 85)' }}
        />
        <span
          className="rounded-full h-1.5 w-1.5"
          style={{ background: 'oklch(0.84 0.17 85)' }}
        />
      </span>
      Pending
    </span>
  )
}

/**
 * Lightweight confetti — 12 maize/navy particles ejected with random
 * velocities. Hardware-accelerated via transform only.
 */
function ConfettiBurst() {
  // Compute particle layout once per mount — Math.random in render would
  // reshuffle on every re-render and cause hydration mismatches if it ever ran
  // server-side.
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2
        const distance = 80 + Math.random() * 80
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          rotate: (Math.random() - 0.5) * 720,
          color:
            i % 3 === 0
              ? 'oklch(0.10 0.02 260)'
              : i % 3 === 1
                ? 'oklch(0.84 0.17 85)'
                : 'oklch(0.55 0.15 142)',
        }
      }),
    []
  )

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map(p => {
        return (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.8 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-2 h-2 rounded-[2px]"
            style={{ background: p.color, willChange: 'transform, opacity' }}
            aria-hidden
          />
        )
      })}
    </div>
  )
}
