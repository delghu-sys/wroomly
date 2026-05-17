'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Quotes } from '@phosphor-icons/react/dist/ssr'
import { StarRating } from '@/components/users/StarRating'

export interface Testimonial {
  quote: string
  name: string
  university: string
  initials: string
  rating?: number
}

interface RotatingTestimonialProps {
  testimonials: Testimonial[]
  /** Cycle interval in ms. Default 7000. */
  intervalMs?: number
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

/**
 * Atmospheric-panel testimonial that auto-advances through a list.
 * Glassmorphism over the dark atmospheric background, quote glyph in
 * maize, optional star rating, manual dot navigation. Pauses on hover.
 */
export function RotatingTestimonial({
  testimonials,
  intervalMs = 7000,
}: RotatingTestimonialProps) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Halt auto-advance entirely if the user prefers reduced motion or has
    // focused into the panel; respects WCAG 2.2.2 (auto-updating content).
    if (paused || prefersReducedMotion || testimonials.length < 2) return
    const t = window.setTimeout(() => {
      setI(n => (n + 1) % testimonials.length)
    }, intervalMs)
    return () => window.clearTimeout(t)
  }, [i, paused, intervalMs, prefersReducedMotion, testimonials.length])

  const t = testimonials[i]
  if (!t) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 1.15 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-live="polite"
      aria-roledescription="carousel"
      className="
        relative max-w-md rounded-3xl overflow-hidden
        border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl
        p-5
      "
      style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.10)' }}
    >
      {/* Quote glyph */}
      <Quotes
        size={24}
        weight="fill"
        className="absolute top-4 right-4"
        style={{ color: 'oklch(0.84 0.17 85 / 0.40)' }}
        aria-hidden
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {t.rating !== undefined && (
            <div className="mb-3">
              <StarRating value={t.rating} size={13} />
            </div>
          )}
          <p className="font-display text-[15.5px] sm:text-base tracking-tight text-white/90 leading-snug italic font-light">
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <span
              className="
                inline-flex items-center justify-center
                w-7 h-7 rounded-full text-[10px] font-semibold
              "
              style={{
                background: 'oklch(0.84 0.17 85)',
                color: 'oklch(0.10 0.02 260)',
              }}
            >
              {t.initials}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-white/85 truncate">
                {t.name}
              </p>
              <p className="text-[10.5px] text-white/40 truncate">
                {t.university}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {testimonials.length > 1 && (
        <div className="mt-4 flex items-center gap-1.5">
          {testimonials.map((_, n) => {
            const active = n === i
            return (
              <button
                key={n}
                type="button"
                onClick={() => setI(n)}
                aria-label={`Testimonial ${n + 1}`}
                aria-current={active}
                className="
                  group inline-flex items-center justify-center h-3
                  active:scale-95 transition-transform
                "
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="block h-1 rounded-full"
                  style={{
                    width: active ? 20 : 6,
                    background: active
                      ? 'oklch(0.84 0.17 85)'
                      : 'oklch(1 0 0 / 0.20)',
                  }}
                />
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
