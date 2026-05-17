'use client'

import { motion } from 'motion/react'
import type { ListingWithDetails } from '@/types/database'
import { BrandListingCard } from '@/components/listings/BrandListingCard'

interface UserListingsStripProps {
  listings: ListingWithDetails[]
}

const grid = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
}

const item = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

/**
 * Horizontal snap-scroll strip of the supplier's active listings. Reuses
 * `BrandListingCard` — the exact same card the /listings grid renders — so
 * the visual language stays identical and we don't fork a second card.
 */
export function UserListingsStrip({ listings }: UserListingsStripProps) {
  return (
    <motion.div
      variants={grid}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-80px 0px' }}
      className="
        flex gap-5 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6
        snap-x snap-mandatory
      "
      style={{ scrollbarWidth: 'thin' }}
    >
      {listings.map(l => (
        <motion.div
          key={l.id}
          variants={item}
          className="snap-start shrink-0 w-[78%] sm:w-[320px]"
        >
          <BrandListingCard listing={l} />
        </motion.div>
      ))}
    </motion.div>
  )
}
