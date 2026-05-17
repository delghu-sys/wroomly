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
      {listings.map(listing => (
        <motion.div key={listing.id} variants={item} className="h-full">
          <BrandListingCard
            listing={listing}
            userId={userId}
            isFavorited={favoriteIds.has(listing.id)}
            supplierRating={ratingBySupplier[listing.supplier_id]}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
