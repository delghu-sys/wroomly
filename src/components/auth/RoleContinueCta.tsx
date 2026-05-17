'use client'

import { useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import type { Role } from './RoleSelectorCards'

interface RoleContinueCtaProps {
  selected: Role | null
  onContinue: () => void
}

const enterSpring = { type: 'spring' as const, stiffness: 100, damping: 20 }

/**
 * "Continue as supplier/consumer →" CTA that fades + slides up into view
 * once a role is selected. Magnetic cursor follow + directional navy fill
 * on hover, matching the homepage MagneticButton.
 */
export function RoleContinueCta({ selected, onContinue }: RoleContinueCtaProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15 })
  const sy = useSpring(y, { stiffness: 150, damping: 15 })

  function onMouseMove(e: React.MouseEvent) {
    if (!selected) return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - r.left - r.width / 2) * 0.22)
    y.set((e.clientY - r.top - r.height / 2) * 0.22)
  }
  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const label =
    selected === 'supplier'
      ? 'Continue as supplier'
      : selected === 'consumer'
        ? 'Continue as consumer'
        : ''

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          key="role-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={enterSpring}
          className="pt-2"
        >
          <motion.button
            ref={ref}
            type="button"
            onClick={onContinue}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{ x: sx, y: sy }}
            className="
              group relative w-full h-12 rounded-full overflow-hidden
              bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]
              font-semibold text-sm tracking-tight
              shadow-[0_4px_18px_oklch(0.84_0.17_85/0.35)]
              hover:shadow-[0_10px_32px_oklch(0.84_0.17_85/0.50)]
              transition-shadow duration-500
            "
          >
            {/* Directional navy fill */}
            <span
              className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ background: 'oklch(0.10 0.02 260)' }}
              aria-hidden
            />
            <span className="relative z-10 inline-flex items-center justify-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
              {label}
              <ArrowRight
                size={16}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
