'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Archive, ArrowUpDown, Bath, Bike, Building2, Car, Droplet, Dumbbell, Flame, Lock, Palmtree, PawPrint, Sofa, Tv, Utensils, WashingMachine, Wifi, Wind, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AmenityGridProps {
  amenities: string[]
}

/**
 * Map an amenity label to a Phosphor glyph using the keyword table from the
 * design spec. Anything we don't recognise falls through to a neutral
 * `Sofa` icon.
 */
function iconFor(label: string): LucideIcon {
  const k = label.toLowerCase()
  if (k.includes('wifi') || k.includes('internet')) return Wifi
  if (k.includes('gym') || k.includes('fitness')) return Dumbbell
  if (k.includes('laundry') || k.includes('washer') || k.includes('dryer'))
    return WashingMachine
  if (
    k.includes('a/c') ||
    k.includes('air condition') ||
    k.includes('cool') ||
    k === 'ac'
  )
    return Wind
  if (k.includes('storage') || k.includes('closet')) return Archive
  if (k.includes('pool') || k.includes('hot tub') || k.includes('jacuzzi'))
    return Droplet
  if (k.includes('elevator') || k.includes('lift')) return ArrowUpDown
  if (k.includes('parking') || k.includes('garage')) return Car
  if (k.includes('dishwasher') || k.includes('kitchen')) return Utensils
  if (
    k.includes('rooftop') ||
    k.includes('roof deck') ||
    k.includes('terrace')
  )
    return Building2
  if (
    k.includes('heat') ||
    k.includes('fireplace') ||
    k.includes('radiator')
  )
    return Flame
  if (k.includes('pet')) return PawPrint
  if (k.includes('util') || k.includes('electric')) return Zap
  if (k.includes('tv') || k.includes('cable')) return Tv
  if (k.includes('bath')) return Bath
  if (k.includes('bike')) return Bike
  if (k.includes('secur') || k.includes('door')) return Lock
  if (k.includes('yard') || k.includes('patio') || k.includes('balcon'))
    return Palmtree
  return Sofa
}

export function AmenityGrid({ amenities }: AmenityGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px 0px' })

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      {amenities.map((amenity, i) => {
        const Icon = iconFor(amenity)
        return (
          <motion.div
            key={amenity}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            whileHover={{ scale: 1.03 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: i * 0.05,
            }}
            className="
              group flex items-center gap-3
              px-4 py-3 rounded-2xl bg-surface border border-line
              hover:border-maize-bright/40
              hover:shadow-2
              transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            "
          >
            <div
              className="
                w-10 h-10 rounded-xl shrink-0
                bg-maize-bright/12 text-gold-deep
                flex items-center justify-center
                transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                group-hover:scale-110 group-hover:-rotate-[4deg]
              "
            >
              <Icon size={20} />
            </div>
            <span className="text-sm text-ink-soft leading-snug">{amenity}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
