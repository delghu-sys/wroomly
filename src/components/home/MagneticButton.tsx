'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

interface MagneticButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  showArrow?: boolean
  className?: string
}

export function MagneticButton({
  children,
  variant = 'primary',
  showArrow = false,
  className = '',
}: MagneticButtonProps) {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15 })
  const springY = useSpring(y, { stiffness: 150, damping: 15 })

  // Reduced-motion users: don't track the cursor at all. The magnetic
  // pull is decorative — they get a static button with no hover scale.
  function handleMouseMove(e: React.MouseEvent) {
    if (prefersReducedMotion) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left - rect.width / 2) * 0.25)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.25)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const styles = {
    primary:
      'bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)] font-semibold hover:shadow-[0_8px_30px_oklch(0.84_0.17_85_/_0.35)]',
    secondary:
      'bg-transparent text-white border border-white/20 hover:border-white/40 hover:shadow-[0_8px_30px_oklch(1_0_0_/_0.05)]',
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      <motion.div
        whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`relative inline-flex items-center gap-2 h-12 px-7 rounded-full text-sm tracking-tight transition-shadow duration-500 cursor-pointer ${styles[variant]}`}
      >
        {children}
        {showArrow && (
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        )}
      </motion.div>
    </motion.div>
  )
}
