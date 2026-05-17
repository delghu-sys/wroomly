'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface ProfileEmptyProps {
  /** Phosphor icon element pre-rendered (e.g. `<Star size={36} weight="duotone" />`). */
  icon: ReactNode
  title: string
  /** Optional italic accent phrase rendered after title. */
  accent?: string
  body: string
}

/**
 * Compact, designed empty state for profile sub-sections (about, listings,
 * reviews). Floats a low-opacity watermark icon behind a short couplet.
 */
export function ProfileEmpty({ icon, title, accent, body }: ProfileEmptyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px 0px' }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="
        relative overflow-hidden rounded-3xl
        border border-dashed border-line
        bg-white/55 backdrop-blur-sm
        px-6 py-10
      "
    >
      {/* Watermark icon */}
      <div
        className="pointer-events-none absolute -top-4 -right-2 opacity-[0.08]"
        style={{ color: 'oklch(0.45 0.13 85)' }}
        aria-hidden
      >
        <div className="scale-[3]">{icon}</div>
      </div>

      <p className="relative font-display text-xl tracking-tight text-ink leading-tight">
        {title}
        {accent && (
          <>
            {' '}
            <span className="italic font-light text-[oklch(0.45_0.13_85)]">
              {accent}
            </span>
          </>
        )}
      </p>
      <p className="relative mt-2 text-sm text-ink-soft max-w-[55ch] leading-relaxed">
        {body}
      </p>
    </motion.div>
  )
}
