import Link from 'next/link'
import Image from 'next/image'
import type { ListingWithDetails } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, BedDouble, Bath, ArrowLeftRight, Calendar, Star } from 'lucide-react'
import { formatCents, formatDateRange, getListingImageUrl } from '@/lib/utils/listing'

interface ListingCardProps {
  listing: ListingWithDetails
  isFavorited?: boolean
  supplierRating?: { avg: number; count: number }
}

export function ListingCard({ listing, supplierRating }: ListingCardProps) {
  const coverImage = listing.listing_images
    .sort((a, b) => a.display_order - b.display_order)
    .at(0)

  const imageUrl = coverImage ? getListingImageUrl(coverImage.storage_path) : null

  const initials = listing.users?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="lift glow-warm bg-surface rounded-3xl border border-line overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[oklch(0.95_0.01_85)] overflow-hidden">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt={listing.title}
                fill
                quality={90}
                className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Soft vignette for chip legibility */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    'linear-gradient(180deg, oklch(0.18 0.025 255 / 0.18) 0%, transparent 35%, transparent 70%, oklch(0.18 0.025 255 / 0.12) 100%)',
                }}
                aria-hidden
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[oklch(0.95_0.01_85)]">
              <BedDouble className="w-10 h-10 text-ink-muted/40" />
            </div>
          )}
          {/* Type chip — refined */}
          <div className="absolute top-3 left-3">
            <span
              className={
                listing.type === 'sublet'
                  ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-surface/95 backdrop-blur text-navy border border-line'
                  : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-maize text-navy border border-maize'
              }
            >
              {listing.type === 'sublet' ? (
                'Sublet'
              ) : (
                <>
                  <ArrowLeftRight className="w-3 h-3" /> Swap
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-lg leading-snug text-ink line-clamp-1 group-hover:text-navy ease-smooth transition-colors">
            {listing.title}
          </h3>

          {listing.neighborhood && (
            <div className="flex items-center gap-1 text-ink-muted text-sm mt-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{listing.neighborhood}, {listing.city}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-ink-soft mt-3.5">
            {listing.bedrooms !== null && (
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5" />
                {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}
              </span>
            )}
            {listing.bathrooms !== null && (
              <span className="flex items-center gap-1.5">
                <Bath className="w-3.5 h-3.5" />
                {listing.bathrooms} bath
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateRange(listing.available_from, listing.available_to)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
            {listing.type === 'sublet' && listing.price_per_month ? (
              <p className="font-display text-xl text-ink tracking-tight">
                {formatCents(listing.price_per_month)}
                <span className="font-sans font-normal text-ink-muted text-sm tracking-normal"> /mo</span>
              </p>
            ) : (
              <p className="font-display text-base text-navy">Housing swap</p>
            )}

            <div className="flex items-center gap-2">
              {supplierRating && (
                <span className="inline-flex items-center gap-0.5 text-xs text-ink">
                  <Star className="w-3 h-3 fill-maize stroke-maize" />
                  <span className="font-medium">{supplierRating.avg.toFixed(1)}</span>
                  <span className="text-ink-muted">({supplierRating.count})</span>
                </span>
              )}
              <Avatar className="h-6 w-6 ring-1 ring-line">
                <AvatarImage src={listing.users?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-navy-soft text-navy">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-ink-muted truncate max-w-[90px]">
                {listing.users?.full_name?.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
