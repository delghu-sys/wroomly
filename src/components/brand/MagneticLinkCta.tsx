'use client'

import { useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'

interface MagneticLinkCtaProps {
  href: string
  /** Optional pre-rendered leading icon (Phosphor element). */
  icon?: ReactNode
  /** Visual variant — primary (maize fill, navy text) or ghost (outline). */
  variant?: 'primary' | 'ghost'
  /**
   * Surrounding-surface tone. Light = default light bg (white ghost button).
   * Dark = atmospheric dark surface (translucent ghost over navy).
   */
  tone?: 'light' | 'dark'
  /** Show the trailing arrow accessory. Default: true for primary, false for ghost. */
  showArrow?: boolean
  /** Button size. Default `md`. */
  size?: 'md' | 'sm'
  children: ReactNode
  className?: string
}

/**
 * Branded magnetic CTA link. Wraps a Next `<Link>`, follows the cursor on
 * hover via spring-tracked motion values, and reveals a directional fill
 * from the left on hover. The motion transform is applied to the wrapper —
 * the Link itself stays a plain anchor for SEO + middle-click behavior.
 */
export function MagneticLinkCta({
  href,
  icon,
  variant = 'primary',
  tone = 'light',
  showArrow,
  size = 'md',
  children,
  className = '',
}: MagneticLinkCtaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15 })
  const sy = useSpring(y, { stiffness: 150, damping: 15 })

  function onMouseMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - r.left - r.width / 2) * 0.22)
    y.set((e.clientY - r.top - r.height / 2) * 0.22)
  }
  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const showArrowResolved = showArrow ?? variant === 'primary'
  const heightCls = size === 'sm' ? 'h-11 text-[13.5px]' : 'h-12 text-sm'

  const base =
    'group relative inline-flex w-full items-center justify-center gap-2 rounded-full overflow-hidden font-semibold tracking-tight transition-shadow duration-500 active:scale-[0.97]'

  const primary =
    'bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)] shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)] hover:shadow-[0_12px_36px_oklch(0.84_0.17_85/0.45)]'

  const ghostLight =
    'bg-white text-ink-soft border border-line shadow-[0_1px_2px_oklch(0_0_0/0.04)] hover:shadow-[0_6px_18px_oklch(0_0_0/0.04)] hover:border-[oklch(0.84_0.17_85/0.40)]'

  const ghostDark =
    'bg-white/[0.05] backdrop-blur-md text-white/85 border border-white/[0.15] hover:bg-white/[0.10] hover:border-[oklch(0.84_0.17_85/0.45)]'

  const ghost = tone === 'dark' ? ghostDark : ghostLight

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ x: sx, y: sy }}
      className="block w-full"
    >
      <Link
        href={href}
        className={`${base} ${heightCls} ${
          variant === 'primary' ? primary : ghost
        } ${className}`}
      >
        {/* Directional fill — navy for primary, maize wash for ghost */}
        <span
          className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            background:
              variant === 'primary'
                ? 'oklch(0.10 0.02 260)'
                : tone === 'dark'
                  ? 'oklch(0.84 0.17 85 / 0.15)'
                  : 'oklch(0.84 0.17 85 / 0.10)',
          }}
          aria-hidden
        />
        <span
          className={`
            relative z-10 inline-flex items-center justify-center gap-2
            transition-colors duration-500
            ${
              variant === 'primary'
                ? 'group-hover:text-[oklch(0.84_0.17_85)]'
                : tone === 'dark'
                  ? 'group-hover:text-white'
                  : 'group-hover:text-ink'
            }
          `}
        >
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
          {showArrowResolved && (
            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          )}
        </span>
      </Link>
    </motion.div>
  )
}
