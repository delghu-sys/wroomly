'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ListingWithDetails } from '@/types/database'
import {
  formatCents,
  formatDateRange,
  getListingImageUrl,
  getListingVideoUrl,
  isNewListing,
} from '@/lib/utils/listing'
import { FavoriteButton } from './FavoriteButton'
import { CardGallery } from './CardGallery'
import { ShareListing } from './ShareListing'
import { track } from '@/lib/track'
import { BedDouble, Calendar, MapPin, ArrowRight } from 'lucide-react'

interface ListingsFeedProps {
  listings: ListingWithDetails[]
  favoriteIds: string[]
  userId: string | null
  nextPageHref?: string | null
}

/**
 * Vertical, swipeable, media-first browse mode (audit item 2) — one listing
 * per viewport, CSS scroll-snap, big media. Reuses CardGallery (horizontal
 * photo swipe nests fine inside vertical snap), FavoriteButton, and
 * ShareListing. Listings with a video walkthrough autoplay it muted while
 * on screen (IntersectionObserver, pause off-screen); everything degrades
 * to photos → single image → branded placeholder.
 */
export function ListingsFeed({ listings, favoriteIds, userId, nextPageHref }: ListingsFeedProps) {
  const favs = new Set(favoriteIds)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    track('feed_viewed', { count: listings.length })
    // Bring the feed to the top of the viewport — the browse hero otherwise
    // eats the first screen and feed mode opens showing no listings.
    containerRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
    // Intentionally mount-only: one event per feed visit, not per re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (listings.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="text-ink-soft">No listings match these filters.</p>
        <Link href="/listings" className="inline-flex items-center gap-1 mt-4 text-navy hover:text-ink">
          Clear filters <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="listings-feed"
      className="h-[calc(100dvh-4rem)] overflow-y-auto snap-y snap-mandatory overscroll-contain scroll-mt-16 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {listings.map(l => (
        <FeedCard key={l.id} listing={l} isFavorited={favs.has(l.id)} userId={userId} />
      ))}
      {nextPageHref && (
        <div className="h-[calc(100dvh-4rem)] snap-start flex items-center justify-center">
          <Link
            href={nextPageHref}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition"
          >
            Keep browsing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

function FeedCard({
  listing,
  isFavorited,
  userId,
}: {
  listing: ListingWithDetails
  isFavorited: boolean
  userId: string | null
}) {
  const imageUrls = [...(listing.listing_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map(img => getListingImageUrl(img.storage_path))
  const videoUrl = listing.video_path ? getListingVideoUrl(listing.video_path) : null
  const priceLabel = listing.price_per_month ? `${formatCents(listing.price_per_month)}/mo` : null

  return (
    <section
      aria-label={listing.title}
      className="h-[calc(100dvh-4rem)] snap-start relative flex items-stretch justify-center bg-[oklch(0.16_0.04_256)]"
    >
      {/* Media column — full-bleed on mobile, phone-width centered on desktop */}
      <div className="relative w-full sm:max-w-[480px] sm:my-4 sm:rounded-3xl overflow-hidden bg-[oklch(0.22_0.075_256)]">
        {videoUrl ? (
          <FeedVideo src={videoUrl} poster={imageUrls[0]} />
        ) : imageUrls.length > 1 ? (
          <div className="absolute inset-0 group">
            <CardGallery images={imageUrls} alt={listing.title} />
          </div>
        ) : imageUrls.length === 1 ? (
          <Image
            src={imageUrls[0]}
            alt={listing.title}
            fill
            quality={90}
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 480px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BedDouble className="w-14 h-14 text-white/20" />
          </div>
        )}

        {/* Legibility gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, oklch(0.16 0.04 256 / 0.55) 45%, oklch(0.14 0.045 256 / 0.94) 100%)',
          }}
          aria-hidden
        />

        <FavoriteButton listingId={listing.id} userId={userId} isFavorited={isFavorited} />

        {/* Bottom overlay: info + actions */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {isNewListing(listing.created_at) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]">
                New
              </span>
            )}
            {priceLabel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[15px] font-bold bg-white/95 text-[oklch(0.22_0.075_256)]">
                {priceLabel}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl text-white leading-tight line-clamp-2">
            {listing.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-white/85">
            {listing.bedrooms != null && (
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="w-4 h-4" strokeWidth={1.75} />
                {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}
              </span>
            )}
            {listing.neighborhood && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" strokeWidth={1.75} />
                {listing.neighborhood}
              </span>
            )}
            {listing.available_from && listing.available_to && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" strokeWidth={1.75} />
                {formatDateRange(listing.available_from, listing.available_to)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <Link
              href={`/listings/${listing.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)] text-sm font-semibold hover:brightness-105 transition active:scale-[0.98]"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
            <ShareListing listingId={listing.id} title={listing.title} priceLabel={priceLabel} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Muted walkthrough that plays only while on screen (autoplay policies
 * require muted + playsInline; pausing off-screen saves data + battery). */
function FeedVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      loop
      preload="metadata"
      className="absolute inset-0 w-full h-full object-cover"
      aria-label="Video walkthrough"
    />
  )
}
