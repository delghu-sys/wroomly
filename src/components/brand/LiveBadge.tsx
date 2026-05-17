'use client'

import { motion } from 'motion/react'

interface LiveBadgeProps {
  children: React.ReactNode
  /**
   * Optional pre-rendered icon element (e.g. `<ShieldCheck className="w-3.5 h-3.5" />`).
   * Passed as ReactNode — not a component reference — so this badge can be used from
   * Server Components without crossing the function-prop boundary.
   */
  icon?: React.ReactNode
  /** Stagger entrance delay */
  delay?: number
  /** Color tone — 'dark' (default, for atmospheric panels) or 'light' (light surfaces) */
  tone?: 'dark' | 'light'
  className?: string
}

/**
 * The pulsing-dot trust badge from the homepage hero.
 * Emerald pulse + optional icon + label.
 */
export function LiveBadge({
  children,
  icon,
  delay = 0,
  tone = 'dark',
  className = '',
}: LiveBadgeProps) {
  const dark = tone === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay }}
      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-sm border ${
        dark
          ? 'bg-white/[0.04] border-white/[0.07]'
          : 'bg-white/70 border-line'
      } ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
        <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
      </span>
      {icon && (
        <span
          className={`shrink-0 ${
            dark ? 'text-[oklch(0.84_0.17_85)]' : 'text-[oklch(0.45_0.13_85)]'
          }`}
        >
          {icon}
        </span>
      )}
      <span
        className={`text-sm font-medium ${
          dark ? 'text-white/75' : 'text-ink-soft'
        }`}
      >
        {children}
      </span>
    </motion.div>
  )
}
