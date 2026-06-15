'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { CreditCard, CheckCircle2, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { FeeNote } from '@/components/brand/FeeNote'

interface AcceptedSystemCardProps {
  rawContent: string
  createdAtIso: string
  isConsumer: boolean
  hasPaid: boolean
  defaultTitle?: string
  defaultType?: string
}

/**
 * In-thread system message rendered when `::deal_accepted::{payload}` arrives.
 * Shows price + Pay CTA for consumer (sublet only) or waiting copy for supplier.
 */
export function AcceptedSystemCard({
  rawContent,
  createdAtIso,
  isConsumer,
  hasPaid,
  defaultTitle,
  defaultType,
}: AcceptedSystemCardProps) {
  const [paying, setPaying] = useState(false)

  const payloadStr = rawContent.slice('::deal_accepted::'.length)
  let data: {
    title?: string
    type?: string
    price?: number
    deposit?: number
    listing_id?: string
  } = {}
  try {
    data = JSON.parse(payloadStr)
  } catch {}

  const title = data.title ?? defaultTitle ?? ''
  const type = data.type ?? defaultType ?? 'sublet'
  const isSublet = type === 'sublet'

  async function startCheckout() {
    if (paying) return
    setPaying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: data.listing_id }),
      })
      const j = await res.json()
      if (!res.ok || !j.url) {
        toast.error(j.error ?? 'Could not start checkout')
        setPaying(false)
        return
      }
      window.location.href = j.url
    } catch {
      toast.error('Could not start checkout')
      setPaying(false)
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      className="flex justify-center my-3"
    >
      <div
        className="
          relative rounded-3xl overflow-hidden
          bg-white/85 backdrop-blur-xl
          border border-emerald-300/40
          shadow-[0_8px_28px_oklch(0.55_0.15_142/0.18)]
          max-w-sm w-full
        "
        style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 8px 28px oklch(0.55 0.15 142 / 0.18)' }}
      >
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-50"
          style={{ background: 'oklch(0.84 0.17 92 / 0.30)' }}
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
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} />
          </motion.div>
          <p className="font-display text-[1.25rem] tracking-tight text-ink leading-tight">
            Inquiry accepted
          </p>
          {title && (
            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{title}</p>
          )}
          {isSublet && data.price && data.price > 0 && (
            <>
              <p className="font-display text-2xl tracking-tight text-ink mt-3">
                ${(data.price / 100).toLocaleString()}
                <span className="text-sm text-ink-muted font-normal"> /mo</span>
              </p>
              {data.deposit !== undefined && data.deposit > 0 && (
                <p className="text-[12.5px] text-ink-muted mt-1">
                  + ${(data.deposit / 100).toLocaleString()} refundable deposit
                </p>
              )}
              {isConsumer && !hasPaid && (
                <div className="mt-1.5">
                  <FeeNote variant="pill" />
                </div>
              )}
            </>
          )}

          {isConsumer && isSublet && !hasPaid && (
            <Button
              onClick={startCheckout}
              disabled={paying}
              className="
                group relative w-full mt-4 h-11 rounded-full overflow-hidden
                bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)]
                hover:shadow-[0_8px_24px_oklch(0.22_0.075_256/0.30)]
                transition-shadow duration-500
                active:scale-[0.98]
              "
            >
              <span className="absolute inset-0 bg-[oklch(0.84_0.17_85)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
              <span className="relative z-10 inline-flex items-center gap-2 group-hover:text-[oklch(0.22_0.075_256)] transition-colors duration-500">
                {paying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {paying ? 'Redirecting…' : 'Pay first month'}
              </span>
            </Button>
          )}

          {hasPaid && (
            <div
              className="mt-4 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'oklch(0.55 0.15 142 / 0.15)', color: 'oklch(0.40 0.13 142)' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Paid · booking confirmed
            </div>
          )}

          <p className="text-[11px] text-ink-muted mt-3 tabular-nums">
            {format(parseISO(createdAtIso), 'h:mm a')}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
