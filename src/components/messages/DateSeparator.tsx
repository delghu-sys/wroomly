'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns'
import { useNow } from '@/lib/hooks/useNow'

interface DateSeparatorProps {
  iso: string
}

/**
 * Mount-aware label.
 *
 *   server / first client paint → absolute `MMM d` (deterministic).
 *   after mount                 → relative `Today / Yesterday / Monday / MMM d`.
 *
 * Without `now`, `isToday()` reads the local clock during render which
 * disagrees between an SSR worker in UTC and a client in PST around
 * midnight → hydration warning. We sidestep it.
 */
function labelFor(iso: string, now: Date | null) {
  const d = parseISO(iso)
  if (!now) return format(d, 'MMM d')
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (differenceInDays(now, d) < 7) return format(d, 'EEEE')
  return format(d, 'MMM d')
}

/**
 * Centered glassmorphism pill separating message groups by date.
 * Fades up into view on scroll.
 */
export const DateSeparator = memo(function DateSeparator({
  iso,
}: DateSeparatorProps) {
  const now = useNow()
  return (
    <div className="flex justify-center my-4">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -20px 0px' }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide text-ink-soft bg-white/70 backdrop-blur-xl border border-line/70 shadow-[inset_0_1px_0_oklch(1_0_0/0.85)]"
      >
        {labelFor(iso, now)}
      </motion.span>
    </div>
  )
})
