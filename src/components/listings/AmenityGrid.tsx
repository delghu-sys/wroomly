'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import {
  Wifi,
  Car,
  PawPrint,
  Zap,
  Snowflake,
  WashingMachine,
  Refrigerator,
  Microwave,
  Tv,
  Dumbbell,
  Bath,
  Bike,
  Lock,
  Sofa,
  TreePine,
  type LucideIcon,
} from 'lucide-react'

interface AmenityGridProps {
  amenities: string[]
}

// Light keyword-based icon resolver — falls back to Sofa.
function iconFor(label: string): LucideIcon {
  const k = label.toLowerCase()
  if (k.includes('wifi') || k.includes('internet')) return Wifi
  if (k.includes('parking') || k.includes('garage')) return Car
  if (k.includes('pet')) return PawPrint
  if (k.includes('util') || k.includes('electric')) return Zap
  if (k.includes('a/c') || k.includes('air') || k.includes('cool')) return Snowflake
  if (k.includes('laundry') || k.includes('washer') || k.includes('dryer')) return WashingMachine
  if (k.includes('fridge') || k.includes('refriger')) return Refrigerator
  if (k.includes('microwave') || k.includes('kitchen')) return Microwave
  if (k.includes('tv') || k.includes('cable')) return Tv
  if (k.includes('gym') || k.includes('fitness')) return Dumbbell
  if (k.includes('bath')) return Bath
  if (k.includes('bike')) return Bike
  if (k.includes('secur') || k.includes('door')) return Lock
  if (k.includes('yard') || k.includes('patio') || k.includes('balcon')) return TreePine
  return Sofa
}

export function AmenityGrid({ amenities }: AmenityGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px 0px' })

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
    >
      {amenities.map((amenity, i) => {
        const Icon = iconFor(amenity)
        return (
          <motion.div
            key={amenity}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: i * 0.05,
            }}
            className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-line hover:border-[oklch(0.84_0.17_85/0.40)] hover:shadow-[0_4px_18px_oklch(0_0_0/0.04)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.84_0.17_85/0.12)] text-[oklch(0.45_0.13_85)] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-[4deg]">
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="text-sm text-ink-soft leading-snug">{amenity}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
