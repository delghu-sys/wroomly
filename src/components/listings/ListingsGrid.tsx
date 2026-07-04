'use client'

import { motion } from 'motion/react'
import type { ListingWithDetails } from '@/types/database'
import { BrandListingCard } from './BrandListingCard'

interface ListingsGridProps {
  listings: ListingWithDetails[]
  userId: string | null
  favoriteIds: Set<string>
  ratingBySupplier: Record<string, { avg: number; count: number }>
}

// Only the above-the-fold cards get the staggered spring entrance. Running
// it on all 24 meant 24 concurrent springs at page load — measurable
// main-thread cost on phones for cards nobody can see yet.
const ANIMATED_COUNT = 6

const grid = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const item = {
  initial: { opacity: 0, y: 28 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

export function ListingsGrid({
  listings,
  userId,
  favoriteIds,
  ratingBySupplier,
}: ListingsGridProps) {
  return (
    <motion.div
      variants={grid}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
    >
      {listings.map((listing, i) => {
        const card = (
          <BrandListingCard
            listing={listing}
            userId={userId}
            isFavorited={favoriteIds.has(listing.id)}
            supplierRating={ratingBySupplier[listing.supplier_id]}
          />
        )
        return i < ANIMATED_COUNT ? (
          <motion.div key={listing.id} variants={item} className="h-full">
            {card}
          </motion.div>
        ) : (
          // content-visibility lets the browser skip layout + paint for
          // offscreen cards entirely — long grids scroll like short ones.
          // The intrinsic-size placeholder keeps the scrollbar honest.
          <div
            key={listing.id}
            className="h-full [content-visibility:auto] [contain-intrinsic-size:auto_430px]"
          >
            {card}
          </div>
        )
      })}
    </motion.div>
  )
}
