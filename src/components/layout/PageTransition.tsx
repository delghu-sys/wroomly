'use client'

import { motion, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'

/**
 * Wraps page content in a motion.div keyed by pathname so a soft
 * fade-up plays on every route change. Reduced-motion users get a
 * straight cut — no motion, no flash, just instant render.
 *
 * Used inside the (app) layout's <main> so every (app) route inherits
 * the transition without each page implementing it separately.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) return <>{children}</>

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1], // Same cubic-bezier as our brand fade-up
      }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}
