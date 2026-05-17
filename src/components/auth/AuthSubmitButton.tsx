'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { ArrowRight, Loader2 } from 'lucide-react'

interface AuthSubmitButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  className?: string
}

/**
 * Magnetic-hover submit button with directional-fill effect, matching the
 * homepage MagneticButton style. Used as the primary auth-form CTA.
 */
export function AuthSubmitButton({
  children,
  loading = false,
  disabled = false,
  type = 'submit',
  onClick,
  className = '',
}: AuthSubmitButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15 })
  const springY = useSpring(y, { stiffness: 150, damping: 15 })

  function onMouseMove(e: React.MouseEvent) {
    if (disabled || loading) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left - rect.width / 2) * 0.20)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.20)
  }

  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ x: springX, y: springY }}
      className={`
        group relative w-full h-12 rounded-full overflow-hidden
        bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]
        font-semibold text-sm tracking-tight
        disabled:opacity-60 disabled:cursor-not-allowed
        shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
        hover:shadow-[0_10px_36px_oklch(0.84_0.17_85/0.45)]
        transition-shadow duration-500
        ${className}
      `}
    >
      {/* Directional fill from left */}
      <span
        className="absolute inset-0 bg-[oklch(0.10_0.02_260)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        aria-hidden
      />

      <span className="relative z-10 inline-flex items-center justify-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading…</span>
          </>
        ) : (
          <>
            {children}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </>
        )}
      </span>
    </motion.button>
  )
}
