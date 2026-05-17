'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, useInView } from 'motion/react'
import { BadgeCheck, Eye, Lock, AlertTriangle, type LucideIcon } from 'lucide-react'

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: 'Verified U-M accounts',
    body: 'Suppliers and consumers verify their identity and university affiliation before posting or applying.',
  },
  {
    icon: Eye,
    title: 'Every listing reviewed',
    body: 'An AI moderator scans each new listing for scams, off-platform contact, and discriminatory language. Borderline cases go to a human admin before they go live.',
  },
  {
    icon: Lock,
    title: 'Payments held in escrow',
    body: 'Rent and deposit are charged through Stripe and only released after both parties confirm move-in. No wire transfers, no Venmo strangers.',
  },
  {
    icon: AlertTriangle,
    title: 'Report anything',
    body: 'Suspicious DM, off-platform offer, or a listing that feels off? Hit Report and we look at it fast. Repeat offenders get banned.',
  },
]

function Tile({
  icon: Icon,
  title,
  body,
  index,
  inView,
}: {
  icon: LucideIcon
  title: string
  body: string
  index: number
  inView: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setHovered(true)
  }, [])

  const onMouseLeave = useCallback(() => setHovered(false), [])

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: index * 0.08,
      }}
      whileHover={{ y: -4 }}
      className="relative rounded-3xl overflow-hidden border border-line bg-white/70 backdrop-blur-xl p-7 sm:p-8 transition-shadow duration-500 hover:shadow-[0_24px_60px_oklch(0_0_0/0.08)]"
    >
      {/* Glass refraction highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85)' }}
        aria-hidden
      />
      {/* Spotlight follower */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(360px at ${mouse.x}px ${mouse.y}px, oklch(0.84 0.17 85 / 0.12), transparent 60%)`,
        }}
        aria-hidden
      />

      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] flex items-center justify-center mb-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <h3 className="font-display text-xl sm:text-2xl tracking-tight text-ink mb-3 leading-tight">
          {title}
        </h3>
        <p className="text-ink-soft leading-relaxed text-[15px]">{body}</p>
      </div>
    </motion.div>
  )
}

export function TrustBento() {
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef, { once: true, margin: '-100px 0px' })

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 sm:grid-cols-2 gap-5"
    >
      {ITEMS.map((item, i) => (
        <Tile key={item.title} {...item} index={i} inView={inView} />
      ))}
    </div>
  )
}
