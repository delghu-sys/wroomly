'use client'

import Link from 'next/link'
import type { ListingWithDetails } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MapPin,
  BedDouble,
  Bath,
  Calendar,
  Star,
  Sofa,
  PawPrint,
} from 'lucide-react'
import {
  formatCents,
  formatDateRange,
  getListingImageUrl,
  isNewListing,
} from '@/lib/utils/listing'
import { FavoriteButton } from './FavoriteButton'
import { CardGallery } from './CardGallery'
import { TiltCard } from '@/components/home/TiltCard'
import { BrandChip } from '@/components/brand/BrandChip'
import { VerifiedBadge } from '@/components/users/VerifiedBadge'

interface BrandListingCardProps {
  listing: ListingWithDetails
  isFavorited?: boolean
  userId?: string | null
  supplierRating?: { avg: number; count: number }
  /** Above-the-fold card: preload its cover photo as the LCP candidate. */
  priorityImage?: boolean
}

/**
 * Listing card matching the homepage brand identity — parallax tilt,
 * spotlight border, soft glass surface, micro-chip badges.
 */
export function BrandListingCard({
  listing,
  isFavorited = false,
  userId = null,
  supplierRating,
  priorityImage = false,
}: BrandListingCardProps) {
  const imageUrls = [...listing.listing_images]
    .sort((a, b) => a.display_order - b.display_order)
    .map(img => getListingImageUrl(img.storage_path))

  const initials = listing.users?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <TiltCard className="rounded-3xl h-full">
      <Link
        href={`/listings/${listing.id}`}
        className="group block h-full transition-transform duration-200 ease-out active:scale-[0.985] motion-reduce:active:scale-100"
      >
        <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 overflow-hidden shadow-[0_2px_16px_oklch(0_0_0/0.05)] hover:shadow-[0_18px_50px_oklch(0_0_0/0.10)] transition-shadow duration-500">
          {/* Swipeable image gallery — browse all photos without opening */}
          <div className="relative aspect-[4/3] bg-[oklch(0.95_0.01_85)] overflow-hidden">
            {imageUrls.length > 0 ? (
              <CardGallery images={imageUrls} alt={listing.title} priority={priorityImage} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[oklch(0.95_0.01_85)]">
                <BedDouble className="w-10 h-10 text-ink-muted/30" />
              </div>
            )}

            <FavoriteButton
              listingId={listing.id}
              userId={userId}
              isFavorited={isFavorited}
            />

            {/* Type chip — top-left (+ honest "New" for ≤72h listings) */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <BrandChip variant="ghost">Sublet</BrandChip>
              {isNewListing(listing.created_at) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]">
                  New
                </span>
              )}
            </div>

            {/* Source provenance (seed or partner) — bottom-left. Plain chip
                (no link): the whole card is already a <Link>, so the clickable
                source link lives on the listing detail page instead. */}
            {listing.source !== 'user' && listing.source_name && (
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-ink-soft shadow-sm">
                  Listed on {listing.source_name}
                </span>
              </div>
            )}

            {/* Feature micro-chips — bottom-left */}
            <div className="absolute bottom-3 left-3 flex gap-1.5">
              {listing.furnished && (
                <BrandChip variant="ghost" icon={Sofa}>
                  Furnished
                </BrandChip>
              )}
              {listing.pets_allowed && (
                <BrandChip variant="ghost" icon={PawPrint}>
                  Pets
                </BrandChip>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              {/* h2: each card is a top-level item under the page h1 (home /
                  browse grids have no intervening h2), so h3 skipped a level. */}
              <h2 className="font-display text-[17px] leading-snug text-ink line-clamp-1 group-hover:text-[oklch(0.45_0.13_85)] transition-colors duration-300">
                {listing.title}
              </h2>
              {supplierRating && (
                <span className="inline-flex items-center gap-0.5 text-xs text-ink shrink-0 mt-0.5">
                  <Star className="w-3 h-3 fill-[oklch(0.84_0.17_85)] stroke-[oklch(0.84_0.17_85)]" />
                  <span className="font-semibold">{supplierRating.avg.toFixed(1)}</span>
                </span>
              )}
            </div>

            {listing.neighborhood && (
              <div className="flex items-center gap-1 text-ink-muted text-sm mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {listing.neighborhood}, {listing.city}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-[13px] text-ink-soft mt-3">
              {listing.bedrooms !== null && (
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" />
                  {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}
                </span>
              )}
              {listing.bathrooms !== null && (
                <span className="inline-flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {listing.bathrooms} bath
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateRange(listing.available_from, listing.available_to)}
              </span>
            </div>

            {/* Price + supplier */}
            <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-line">
              {listing.price_per_month ? (
                <p className="font-display text-xl text-ink tracking-tight">
                  {formatCents(listing.price_per_month)}
                  <span className="font-sans font-normal text-ink-muted text-sm tracking-normal">
                    {' '}
                    /mo
                  </span>
                </p>
              ) : (
                <p className="font-display text-base text-ink-muted">Price TBD</p>
              )}

              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6 ring-1 ring-line">
                  <AvatarImage src={listing.users?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-ink-muted truncate max-w-[80px]">
                  {listing.users?.full_name?.split(' ')[0]}
                </span>
                {listing.users?.is_verified && <VerifiedBadge size={13} />}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </TiltCard>
  )
}
