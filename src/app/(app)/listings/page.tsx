import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { ListingWithDetails } from '@/types/database'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { QuickFilterChips } from '@/components/listings/QuickFilterChips'
import { SaveSearchButton } from '@/components/listings/SaveSearchButton'
import { ListingsMap, type MapListing } from '@/components/listings/ListingsMap'
import { ListingsQuickFilters } from '@/components/listings/ListingsQuickFilters'
import { MobileFilterSheet } from '@/components/listings/MobileFilterSheet'
import { BrowseHero } from '@/components/listings/BrowseHero'
import { ListingsGrid } from '@/components/listings/ListingsGrid'
import { EmptyListings } from '@/components/listings/EmptyListings'
import {
  ANN_ARBOR_NEIGHBORHOODS,
  ANN_ARBOR_RESIDENCES,
  PROPERTY_TYPES,
} from '@/lib/constants'
import { getListingImageUrl } from '@/lib/utils/listing'

export const metadata: Metadata = {
  title: 'Browse Listings',
  description:
    'Find verified sublets and apartment swaps near the University of Michigan.',
  openGraph: {
    title: 'Browse Listings | Wroomly',
    description:
      'Find verified sublets and apartment swaps near the University of Michigan.',
    images: ['/og-default.png'],
  },
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawFilters = await searchParams
  const filters: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(rawFilters)) {
    filters[k] = Array.isArray(v) ? v[0] : v
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, avatar_url, university)
    `)
    .eq('status', 'active')

  if (filters.q) {
    // PostgREST .or() takes a comma-delimited filter expression. Any comma,
    // paren, or backslash in user input would break out of the value slot —
    // strip those characters and clamp length before interpolating. Percent
    // and underscore are LIKE wildcards which are safe (user-facing fuzzy
    // search) but we still cap input to a sane upper bound.
    const safeQ = filters.q
      .replace(/[,()\\]/g, ' ')
      .trim()
      .slice(0, 80)
    if (safeQ.length > 0) {
      query = query.or(
        `title.ilike.%${safeQ}%,description.ilike.%${safeQ}%,neighborhood.ilike.%${safeQ}%,residence_name.ilike.%${safeQ}%`
      )
    }
  }
  if (filters.type === 'sublet' || filters.type === 'swap') {
    query = query.eq('type', filters.type)
  }
  if (filters.neighborhood) {
    query = query.eq('neighborhood', filters.neighborhood)
  }
  if (filters.property_type) {
    query = query.eq('property_type', filters.property_type)
  }
  if (filters.residence_name) {
    query = query.eq('residence_name', filters.residence_name)
  }
  if (filters.min_price) {
    query = query.gte('price_per_month', parseInt(filters.min_price) * 100)
  }
  if (filters.max_price) {
    query = query.lte('price_per_month', parseInt(filters.max_price) * 100)
  }
  if (filters.bedrooms) {
    query = query.eq('bedrooms', parseInt(filters.bedrooms))
  }
  if (filters.available_from) {
    query = query.lte('available_from', filters.available_from)
  }
  if (filters.furnished === 'true') {
    query = query.eq('furnished', true)
  }
  if (filters.pets === 'true') {
    query = query.eq('pets_allowed', true)
  }

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price_per_month', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
      query = query.order('price_per_month', { ascending: false, nullsFirst: false })
      break
    case 'date_asc':
      query = query.order('available_from', { ascending: true })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query.limit(48)

  // Favorites (auth-gated) + supplier ratings are independent — fan out
  // so we save a round trip per browse page load.
  const supplierIds = Array.from(
    new Set(((listings ?? []) as ListingWithDetails[]).map(l => l.supplier_id))
  )

  const [favsRes, ratingsRes] = await Promise.all([
    authUser
      ? supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', authUser.id)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
    supplierIds.length > 0
      ? supabase
          .from('reviews')
          .select('reviewee_id, rating')
          .in('reviewee_id', supplierIds)
      : Promise.resolve({ data: [] as { reviewee_id: string; rating: number }[] }),
  ])

  const favoriteIds = new Set<string>()
  for (const f of favsRes.data ?? []) favoriteIds.add(f.listing_id)

  const ratingBySupplier: Record<string, { avg: number; count: number }> = {}
  if (supplierIds.length > 0) {
    const buckets: Record<string, number[]> = {}
    for (const r of (ratingsRes.data ?? []) as { reviewee_id: string; rating: number }[]) {
      ;(buckets[r.reviewee_id] ??= []).push(r.rating)
    }
    for (const [id, ratings] of Object.entries(buckets)) {
      ratingBySupplier[id] = {
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        count: ratings.length,
      }
    }
  }

  const view: 'grid' | 'map' = filters.view === 'map' ? 'map' : 'grid'
  const typedListings = (listings ?? []) as ListingWithDetails[]

  const mapListings: MapListing[] = typedListings.map(l => {
    const firstImage = l.listing_images?.[0]
    const image_url = firstImage ? getListingImageUrl(firstImage.storage_path) : null
    return {
      id: l.id,
      title: l.title,
      lat: l.lat ?? NaN,
      lng: l.lng ?? NaN,
      price_per_month: l.price_per_month,
      neighborhood: l.neighborhood,
      image_url,
    }
  }).filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng))

  const neighborhoods = ANN_ARBOR_NEIGHBORHOODS as unknown as string[]
  const residences = ANN_ARBOR_RESIDENCES as unknown as string[]
  const propertyTypes = PROPERTY_TYPES as unknown as { value: string; label: string }[]

  return (
    <div className="min-h-[100dvh]">
      {/* ── Atmospheric hero — dark navy, mesh, noise ── */}
      <BrowseHero
        totalCount={typedListings.length}
        currentQuery={filters.q}
        filters={filters}
        view={view}
      />

      {/* ── Content area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Preset quick filters + save-search action. Mobile users
            browse without opening the sidebar, so these need to be
            reachable from the first scroll position. */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <QuickFilterChips currentFilters={filters} />
          </div>
          <SaveSearchButton
            currentFilters={filters}
            authed={!!authUser}
          />
        </div>

        {/* Active filters + count strip */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <MobileFilterSheet
            neighborhoods={neighborhoods}
            residences={residences}
            propertyTypes={propertyTypes}
            currentFilters={filters}
            activeFilterCount={Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'view').length}
          />
          <ListingsQuickFilters
            currentFilters={filters}
            totalCount={typedListings.length}
          />
        </div>

        <div className="flex gap-8">
          {/* Sidebar — glassmorphic, desktop only */}
          <aside className="hidden lg:block lg:w-[300px] shrink-0">
            <ListingsFilters
              neighborhoods={neighborhoods}
              residences={residences}
              propertyTypes={propertyTypes}
              currentFilters={filters}
            />
          </aside>

          {/* Main grid */}
          <div className="flex-1 min-w-0">
            {typedListings.length === 0 ? (
              <EmptyListings />
            ) : view === 'map' ? (
              <div className="animate-fade-in">
                <ListingsMap listings={mapListings} />
                {mapListings.length !== typedListings.length && (
                  <p className="text-ink-muted text-xs mt-3 text-center">
                    {mapListings.length} of {typedListings.length} listings have map coordinates
                  </p>
                )}
              </div>
            ) : (
              <ListingsGrid
                listings={typedListings}
                userId={authUser?.id ?? null}
                favoriteIds={favoriteIds}
                ratingBySupplier={ratingBySupplier}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
