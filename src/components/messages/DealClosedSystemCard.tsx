'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { PartyPopper, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface DealClosedSystemCardProps {
  rawContent: string
  createdAtIso: string
  isConsumer: boolean
}

/**
 * In-thread system message rendered when `::deal_closed::{payload}` arrives —
 * posted when the supplier marks the listing as taken. Confirms the place is
 * off the market and reassures the matched renter they can still open the
 * listing (RLS keeps it readable to them via `closed_with`).
 */
export function DealClosedSystemCard({
  rawContent,
  createdAtIso,
  isConsumer,
}: DealClosedSystemCardProps) {
  const payloadStr = rawContent.slice('::deal_closed::'.length)
  let data: { title?: string; listing_id?: string; type?: string } = {}
  try {
    data = JSON.parse(payloadStr)
  } catch {}

  const isSwap = data.type === 'swap'
  const headline = isSwap ? 'Swap confirmed' : 'Deal confirmed'
  const sub = isConsumer
    ? isSwap
      ? 'This swap is set — the listing is now off the market. You can still open it any time for the details.'
      : 'This place is yours — the listing is now off the market. You can still open it any time for the details.'
    : 'You marked this place as taken. It’s off the market and other pending inquiries were declined.'

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      className="flex justify-center my-3"
    >
      <div
        className="relative rounded-3xl overflow-hidden bg-white/85 backdrop-blur-xl border border-emerald-300/40 max-w-sm w-full"
        style={{
          boxShadow:
            'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 8px 28px oklch(0.55 0.15 142 / 0.18)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-50"
          style={{ background: 'oklch(0.55 0.15 142 / 0.25)' }}
          aria-hidden
        />

        <div className="relative p-5 text-center">
          <motion.div
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.05 }}
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3 shadow-[0_6px_20px_oklch(0.55_0.15_142/0.30)]"
            style={{ background: 'oklch(0.55 0.15 142)', color: 'white' }}
          >
            <PartyPopper className="w-5 h-5" strokeWidth={2.25} />
          </motion.div>

          <p className="font-display text-[1.25rem] tracking-tight text-ink leading-tight">
            {headline}
          </p>
          {data.title && (
            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">
              {data.title}
            </p>
          )}
          <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{sub}</p>

          {isConsumer && data.listing_id && (
            <Link
              href={`/listings/${data.listing_id}`}
              className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-[oklch(0.32_0.10_85)] underline-offset-4 hover:underline transition-colors"
            >
              View the listing <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.25} />
            </Link>
          )}

          <p className="text-[11px] text-ink-muted mt-3 tabular-nums">
            {format(parseISO(createdAtIso), 'h:mm a')}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
