'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Bed, MapPin, ArrowsLeftRight } from '@phosphor-icons/react/dist/ssr'
import type { ListingWithDetails } from '@/types/database'
import { formatCents, getListingImageUrl } from '@/lib/utils/listing'
import { BrandChip } from '@/components/brand/BrandChip'

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

export function UserListingsStrip({ listings }: UserListingsStripProps) {
  return (
    <motion.div
      variants={grid}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-80px 0px' }}
      className="
        flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6
        snap-x snap-mandatory
        scrollbar-thin
      "
      style={{ scrollbarWidth: 'thin' }}
    >
      {listings.map(l => {
        const cover = l.listing_images
          ?.slice()
          .sort((a, b) => a.display_order - b.display_order)
          .at(0)
        const imageUrl = cover ? getListingImageUrl(cover.storage_path) : null

        return (
          <motion.div
            key={l.id}
            variants={item}
            className="snap-start shrink-0 w-[78%] sm:w-[300px]"
          >
            <Link href={`/listings/${l.id}`} className="group block h-full">
              <div className="relative h-full rounded-3xl overflow-hidden border border-line bg-white shadow-[0_2px_12px_oklch(0_0_0/0.04)] hover:shadow-[0_14px_36px_oklch(0_0_0/0.08)] transition-shadow duration-500">
                <div className="relative aspect-[4/3] bg-[oklch(0.95_0.01_85)]">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={l.title}
                      fill
                      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                      sizes="(max-width: 640px) 78vw, 300px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bed
                        size={28}
                        weight="duotone"
                        className="text-ink-muted/40"
                      />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {l.type === 'sublet' ? (
                      <BrandChip variant="ghost">Sublet</BrandChip>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]">
                        <ArrowsLeftRight size={11} weight="bold" />
                        Swap
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display text-base leading-snug text-ink line-clamp-1 group-hover:text-[oklch(0.45_0.13_85)] transition-colors">
                    {l.title}
                  </h3>
                  {l.neighborhood && (
                    <p className="text-[12px] text-ink-muted mt-1 inline-flex items-center gap-1">
                      <MapPin
                        size={12}
                        weight="duotone"
                        className="shrink-0"
                      />
                      <span className="truncate">{l.neighborhood}</span>
                    </p>
                  )}
                  {l.type === 'sublet' && l.price_per_month && (
                    <p className="font-display text-lg text-ink tracking-tight mt-2.5">
                      {formatCents(l.price_per_month)}
                      <span className="font-sans text-sm text-ink-muted font-normal">
                        {' '}
                        /mo
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
