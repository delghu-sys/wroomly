'use client'

import { useEffect, useRef, useState } from 'react'
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
import { BedDouble, Calendar, MapPin, ArrowRight, LayoutGrid } from 'lucide-react'

interface ListingsFeedProps {
  listings: ListingWithDetails[]
  favoriteIds: string[]
  userId: string | null
  nextPageHref?: string | null
  /** Back to Grid, same filters minus view=feed. The feed's own scroll
   * container uses overscroll-contain so its snap scroll doesn't fight the
   * outer page — which also traps scroll input, making the Grid/Map toggle
   * in the hero above unreachable. This is the feed's own way out. */
  exitHref: string
}

/**
 * Vertical, swipeable, media-first browse mode (audit item 2) — one listing
 * per viewport, CSS scroll-snap, big media. Reuses CardGallery (horizontal
 * photo swipe nests fine inside vertical snap), FavoriteButton, and
 * ShareListing. Listings with a video walkthrough autoplay it muted while
 * on screen (IntersectionObserver, pause off-screen); everything degrades
 * to photos → single image → branded placeholder.
 */
export function ListingsFeed({ listings, favoriteIds, userId, nextPageHref, exitHref }: ListingsFeedProps) {
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
      // svh, not dvh: iOS resizes dvh as the URL bar collapses mid-scroll,
      // which re-lays-out every snap card WHILE scrolling — visible stutter.
      // svh stays constant for the whole gesture.
      className="h-[calc(100svh-4rem)] overflow-y-auto snap-y snap-mandatory overscroll-contain scroll-mt-16 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Pinned exit — position:fixed, not absolute/sticky. Verified: an
          absolutely-positioned child of this overflow-y-auto container
          scrolls away with the content (its containing block is the
          scrolled canvas, not the viewport); sticky would stay put but
          adds real layout height, offsetting every snap card below it.
          Fixed is the only option that stays on screen for free — no
          transform/filter/perspective ancestor exists here to give it a
          different containing block. This is the feed's own way out,
          since overscroll-contain traps scroll input and the Grid/Map
          toggle in the hero above becomes unreachable once inside. */}
      <Link
        href={exitHref}
        aria-label="Exit feed, back to grid view"
        className="fixed top-20 left-4 z-30 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[oklch(0.14_0.03_256/0.75)] backdrop-blur border border-white/15 text-white text-[13px] font-medium hover:bg-[oklch(0.14_0.03_256/0.9)] transition active:scale-[0.97]"
      >
        <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
        Grid
      </Link>

      {listings.map((l, i) => (
        <FeedCard key={l.id} listing={l} index={i} isFavorited={favs.has(l.id)} userId={userId} />
      ))}
      {nextPageHref && (
        <div className="h-[calc(100svh-4rem)] snap-start flex items-center justify-center">
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
  index,
  isFavorited,
  userId,
}: {
  listing: ListingWithDetails
  index: number
  isFavorited: boolean
  userId: string | null
}) {
  // Media virtualization: 24 full-viewport cards × several images each is
  // too much decode + compositor memory for a phone. Each card mounts its
  // media only once it comes within ~1.5 screens of the viewport (first two
  // cards mount immediately for instant first paint). Once mounted it stays
  // — decoded images are cheap to keep, re-mounting would re-jank.
  const sectionRef = useRef<HTMLElement>(null)
  const [nearby, setNearby] = useState(index < 2)
  useEffect(() => {
    if (nearby) return
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearby(true)
          io.disconnect()
        }
      },
      { rootMargin: '150% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [nearby])

  const imageUrls = [...(listing.listing_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map(img => getListingImageUrl(img.storage_path))
  const videoUrl = listing.video_path ? getListingVideoUrl(listing.video_path) : null
  const priceLabel = listing.price_per_month ? `${formatCents(listing.price_per_month)}/mo` : null

  return (
    <section
      ref={sectionRef}
      aria-label={listing.title}
      className="h-[calc(100svh-4rem)] snap-start relative flex items-stretch justify-center bg-[oklch(0.16_0.04_256)]"
    >
      {/* Media column — full-bleed on mobile, phone-width centered on desktop */}
      <div className="relative w-full sm:max-w-[480px] sm:my-4 sm:rounded-3xl overflow-hidden bg-[oklch(0.22_0.075_256)]">
        {!nearby ? null : videoUrl ? (
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
            quality={75}
            priority={index === 0}
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
