'use client'

import { BrandListingCard } from './BrandListingCard'
import { ListingsMap, type MapListing } from './ListingsMap'
import { HoveredListingProvider, HoverLinkedCard } from './HoveredListing'
import type { ListingWithDetails } from '@/types/database'

interface ListingsSplitViewProps {
  listings: ListingWithDetails[]
  mapListings: MapListing[]
  userId: string | null
  favoriteIds: Set<string>
  ratingBySupplier: Record<string, { avg: number; count: number }>
}

/**
 * List and map side by side, pointing at each other.
 *
 * The two columns show the same page of results — the standalone map view
 * loads up to 500 pins while the grid paginates at 24, and pairing those would
 * mean hovering a pin that has no card. Split view stays on the paginated set
 * so every pin has a card and every card has a pin.
 *
 * Below lg the map column is dropped entirely rather than stacked. A map you
 * have to scroll past to reach the results is worse than no map, and a linked
 * hover means nothing on a touch screen — that's what the dedicated Map view
 * in the toggle is for.
 */
export function ListingsSplitView({
  listings,
  mapListings,
  userId,
  favoriteIds,
  ratingBySupplier,
}: ListingsSplitViewProps) {
  const missingCoords = listings.length - mapListings.length

  return (
    <HoveredListingProvider>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6 lg:items-start">
        {/* Results column: always one card wide once the map is beside it.
            The page is capped at max-w-7xl and the filters sidebar takes ~300px
            of that, so this column is ~415px at every viewport past lg — a
            second column would just halve the cards to 200px, and a viewport
            breakpoint can't see the container cap to know better.
            Two-up below lg is for when the map column is gone and the list has
            the full width to itself. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 min-w-0">
          {listings.map((listing, i) => (
            <HoverLinkedCard key={listing.id} id={listing.id} className="h-full">
              <BrandListingCard
                listing={listing}
                userId={userId}
                isFavorited={favoriteIds.has(listing.id)}
                supplierRating={ratingBySupplier[listing.supplier_id]}
                priorityImage={i < 2}
              />
            </HoverLinkedCard>
          ))}
        </div>

        {/* Map column — sticky, so it stays put while the list scrolls past. */}
        <div className="hidden lg:block lg:sticky lg:top-24">
          <ListingsMap
            listings={mapListings}
            linkHover
            heightClass="h-[calc(100vh-8rem)] min-h-[520px]"
          />
          {missingCoords > 0 && (
            <p className="text-xs text-ink-muted mt-3">
              {missingCoords} listing{missingCoords === 1 ? '' : 's'} on this page
              {missingCoords === 1 ? ' has' : ' have'} no map location set.
            </p>
          )}
        </div>
      </div>
    </HoveredListingProvider>
  )
}
