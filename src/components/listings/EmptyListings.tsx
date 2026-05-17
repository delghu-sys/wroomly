'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Compass, DollarSign, CalendarRange, MapPin } from 'lucide-react'
import { MagneticButton } from '@/components/home/MagneticButton'

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

/**
 * Composed empty state for the browse page.
 * Glass panel, floating compass icon, three suggestion chips, magnetic CTA.
 */
export function EmptyListings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative rounded-3xl overflow-hidden border border-line bg-white/60 backdrop-blur-xl"
    >
      {/* Subtle atmosphere inside the panel */}
      <div
        className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: 'oklch(0.84 0.17 85 / 0.18)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: 'oklch(0.50 0.10 280 / 0.18)' }}
        aria-hidden
      />

      <div className="relative px-6 py-16 sm:py-20 text-center">
        {/* Floating compass mark */}
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="relative inline-flex"
        >
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] shadow-[0_18px_50px_oklch(0.10_0.02_260/0.30)]">
            <Compass className="w-9 h-9" strokeWidth={1.5} />
            {/* Live pulse */}
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
              <span className="rounded-full h-3 w-3 bg-emerald-400 border-2 border-[oklch(0.10_0.02_260)]" />
            </span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="font-display text-3xl sm:text-4xl tracking-tight text-ink mt-7 leading-[1.05]"
        >
          Nothing here yet —{' '}
          <span className="italic font-light text-[oklch(0.45_0.13_85)]">
            but the map is wide open.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="mt-4 text-ink-soft max-w-md mx-auto leading-relaxed"
        >
          We don&rsquo;t have a listing that matches all your filters right now.
          New places land every day — try loosening one criterion below.
        </motion.p>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {[
            { icon: DollarSign, label: 'Increase your budget' },
            { icon: CalendarRange, label: 'Broaden your dates' },
            { icon: MapPin, label: 'Browse nearby areas' },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-line text-xs text-ink-soft shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
            >
              <Icon className="w-3 h-3 text-[oklch(0.45_0.13_85)]" />
              {label}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="mt-9 inline-block"
        >
          <Link href="/listings">
            <MagneticButton variant="primary" showArrow>
              Clear all filters
            </MagneticButton>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
