'use client'

import { memo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Door, Keyhole } from '@phosphor-icons/react/dist/ssr'

/**
 * Decorative floating door + keyhole motif for the 404 page.
 * Memoized + isolated — perpetual float animations never re-render
 * the parent route segment.
 *
 * Reduced-motion users get the static door + keyhole with no loops.
 */
export const FloatingDoor = memo(function FloatingDoor() {
  const prefersReducedMotion = useReducedMotion()
  return (
    <div className="relative w-full h-full" aria-hidden>
      {/* Backdrop blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="
            relative w-64 h-64 rounded-[2rem]
            border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl
            shadow-[0_30px_80px_oklch(0_0_0/0.30)]
          "
          style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.10), 0 30px 80px oklch(0 0 0 / 0.30)' }}
        >
          {/* Gold accent corner glow */}
          <div
            className="pointer-events-none absolute -top-12 -right-10 w-52 h-52 rounded-full blur-3xl opacity-50"
            style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
          />

          {/* Door icon — gentle floating spring */}
          <motion.div
            initial={prefersReducedMotion ? false : { y: 12, rotate: -2 }}
            animate={
              prefersReducedMotion
                ? { y: 0, rotate: 0 }
                : { y: [-8, 8, -8], rotate: [-2, 2, -2] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 6, ease: 'easeInOut', repeat: Infinity }
            }
            className="absolute inset-0 flex items-center justify-center"
          >
            <Door
              size={104}
              weight="duotone"
              style={{ color: 'oklch(0.84 0.17 85)' }}
            />
          </motion.div>

          {/* Tiny floating keyhole — counter-rotates */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { y: -4, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { y: 0, opacity: 1 }
                : { y: [4, -4, 4], opacity: [0.7, 1, 0.7] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 4.5, ease: 'easeInOut', repeat: Infinity, delay: 0.4 }
            }
            className="absolute top-6 right-6"
          >
            <Keyhole
              size={20}
              weight="duotone"
              className="text-white/40"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Floating particle dots — pure CSS keyframes via Tailwind utilities */}
      <div
        className="absolute top-10 left-12 w-1.5 h-1.5 rounded-full animate-float"
        style={{ background: 'oklch(0.84 0.17 85 / 0.50)', animationDelay: '0.5s' }}
      />
      <div
        className="absolute bottom-16 right-10 w-1 h-1 rounded-full animate-float-slow"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)', animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/3 right-4 w-2 h-2 rounded-full animate-float"
        style={{ background: 'oklch(1 0 0 / 0.15)', animationDelay: '3.5s' }}
      />
    </div>
  )
})
