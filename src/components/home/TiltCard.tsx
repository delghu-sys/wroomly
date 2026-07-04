'use client'

import { useRef, useState, useCallback, useSyncExternalStore } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'

// Reactive `(pointer: fine)` media query. Server snapshot is `false`, so SSR
// + first client paint both render the cheap non-tilt path — no hydration
// mismatch, and touch devices never construct the motion machinery at all.
function subscribeFinePointer(cb: () => void) {
  const m = window.matchMedia('(pointer: fine)')
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia('(pointer: fine)').matches,
    () => false,
  )
}

interface TiltCardProps {
  children: React.ReactNode
  className?: string
}

/**
 * Pointer-tracked parallax tilt. Desktop-only by design: on touch devices
 * there's no hover to track, but the motion wrapper still cost a spring
 * system + a 3D-perspective composite layer PER CARD (24 on the browse
 * grid) — real scroll jank on phones for an effect that can never trigger.
 * Touch gets a plain div; pointer:fine gets the full effect.
 */
export function TiltCard({ children, className }: TiltCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const finePointer = useFinePointer()

  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 })
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (prefersReducedMotion) return
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      rotateX.set((y - centerY) / 18)
      rotateY.set((centerX - x) / 18)
      setMousePos({ x, y })
      setIsHovered(true)
    },
    [rotateX, rotateY, prefersReducedMotion]
  )

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
    setIsHovered(false)
  }, [rotateX, rotateY])

  if (!finePointer) {
    return <div className={`relative ${className || ''}`}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformPerspective: 1000,
      }}
      className={`relative ${className || ''}`}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 350px at ${mousePos.x}px ${mousePos.y}px, oklch(0.84 0.17 85 / 0.10), transparent 50%)`,
        }}
      />
    </motion.div>
  )
}
