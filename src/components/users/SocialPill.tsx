'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'

/* Lucide no longer ships brand glyphs; this is the classic Instagram mark
   drawn in the same 24-grid / 2px-stroke style so it sits flush with the
   rest of the icon set. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

interface SocialPillProps {
  /** Currently supports Instagram. Add more variants as the schema grows. */
  network: 'instagram'
  handle: string
}

/**
 * Branded social link as a pill button with magnetic hover and directional
 * accent-fill on hover. Replaces raw `<a>` tags for the profile section.
 */
export function SocialPill({ network, handle }: SocialPillProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15 })
  const sy = useSpring(y, { stiffness: 150, damping: 15 })

  function onMouseMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - r.left - r.width / 2) * 0.20)
    y.set((e.clientY - r.top - r.height / 2) * 0.20)
  }
  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const cleanHandle = handle.replace(/^@/, '')
  const href =
    network === 'instagram' ? `https://instagram.com/${cleanHandle}` : '#'

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ x: sx, y: sy }}
      className="
        group relative inline-flex items-center gap-2
        h-10 pl-3 pr-3.5 rounded-full overflow-hidden
        bg-surface border border-line text-ink-soft
        text-[13px] font-medium tracking-tight
        shadow-1
        hover:shadow-glow-maize
        transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
      "
    >
      {/* Directional maize fill from left */}
      <span
        className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ background: 'var(--maize-bright)' }}
        aria-hidden
      />
      <span className="relative z-10 inline-flex items-center gap-2 group-hover:text-navy-deep transition-colors duration-500">
        <InstagramGlyph className="w-4 h-4 shrink-0" />
        <span>@{cleanHandle}</span>
        <ArrowUpRight
          size={13}
          className="opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </motion.a>
  )
}
