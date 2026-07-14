import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
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
import { JustListedStrip } from '@/components/listings/JustListedStrip'
import { ListingsPagination } from '@/components/listings/ListingsPagination'
import { EmptyListings } from '@/components/listings/EmptyListings'
import {
  ANN_ARBOR_NEIGHBORHOODS,
  ANN_ARBOR_RESIDENCES,
  PROPERTY_TYPES,
} from '@/lib/constants'
import { getListingImageUrl, justListedCutoffISO } from '@/lib/utils/listing'

export const metadata: Metadata = {
  title: 'Browse University of Michigan Sublets in Ann Arbor',
  description:
    'Browse verified University of Michigan sublets in Ann Arbor. Filter by neighborhood, price, bedrooms, and move-in date. Every account @umich.edu-verified.',
  // SEO: every filtered variant (?type=sublet, ?furnished=true, ?q=…) is the
  // same content sliced differently — canonicalize them all to the bare
  // /listings URL so crawl equity isn't split across thousands of
  // near-duplicate parameter URLs.
  alternates: {
    canonical: '/listings',
  },
  openGraph: {
    title: 'Browse University of Michigan Sublets in Ann Arbor | Wroomly',
    description:
      'Verified UMich sublets in Ann Arbor. Filter by neighborhood, price, and dates.',
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
    .select(
      `
      ${PUBLIC_LISTING_COLUMNS},
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, avatar_url, university, is_verified)
    `,
      { count: 'exact' },
    )
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
    // Multi-select: comma-joined neighborhoods → match any of them.
    const hoods = filters.neighborhood.split(',').filter(Boolean)
    if (hoods.length) query = query.in('neighborhood', hoods)
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
    // Multi-select: comma-joined bedroom counts → match any of them.
    const beds = filters.bedrooms.split(',').map(n => parseInt(n)).filter(n => Number.isInteger(n))
    if (beds.length) query = query.in('bedrooms', beds)
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

  // Grid view paginates; map view loads a larger set so all pins show.
  const PAGE_SIZE = 24
  const isMapView = filters.view === 'map'
  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1)

  if (isMapView) {
    query = query.limit(500)
  } else {
    const from = (page - 1) * PAGE_SIZE
    query = query.range(from, from + PAGE_SIZE - 1)
  }

  const { data: listings, count } = await query
  const totalCount = count ?? (listings?.length ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Favorites (auth-gated) + supplier ratings are independent — fan out
  // so we save a round trip per browse page load.
  const supplierIds = Array.from(
    new Set(((listings ?? []) as ListingWithDetails[]).map(l => l.supplier_id))
  )

  const [favsRes, ratingsRes, marketRes, hoodRes, justListedRes] = await Promise.all([
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
    // Total active inventory (unfiltered) — the hero pill is a market stat,
    // not the filtered result count, so a strict filter doesn't make it read
    // "0 places available".
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    // Distinct neighborhoods that actually appear in live listings — the filter
    // options must match the data, not a static gazetteer that matches nothing.
    supabase.from('listings').select('neighborhood').eq('status', 'active').not('neighborhood', 'is', null),
    // "Just listed" strip: newest actives from the last 72h ONLY — the strip
    // hides itself under 3 results rather than padding with old inventory.
    supabase
      .from('listings')
      .select(`${PUBLIC_LISTING_COLUMNS}, listing_images(*)`)
      .eq('status', 'active')
      .gte('created_at', justListedCutoffISO())
      .order('created_at', { ascending: false })
      .limit(6),
  ])
  const marketTotal = (marketRes as { count?: number | null }).count ?? totalCount
  const dataHoods = Array.from(
    new Set(
      ((hoodRes.data ?? []) as { neighborhood: string | null }[])
        .map(h => h.neighborhood)
        .filter((n): n is string => !!n && n.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b))

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
  const justListed = (justListedRes.data ?? []) as unknown as ListingWithDetails[]

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

  // Prefer neighborhoods present in live listings; fall back to the gazetteer
  // only if the data query somehow comes back empty.
  const neighborhoods = dataHoods.length
    ? dataHoods
    : (ANN_ARBOR_NEIGHBORHOODS as unknown as string[])
  const residences = ANN_ARBOR_RESIDENCES as unknown as string[]
  const propertyTypes = PROPERTY_TYPES as unknown as { value: string; label: string }[]

  return (
    <div className="min-h-[100dvh]">
      {/* ── Atmospheric hero — dark navy, mesh, noise ── */}
      <BrowseHero
        totalCount={marketTotal}
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
            totalCount={totalCount}
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
              <>
                {page === 1 && <JustListedStrip listings={justListed} />}
                <ListingsGrid
                  listings={typedListings}
                  userId={authUser?.id ?? null}
                  favoriteIds={favoriteIds}
                  ratingBySupplier={ratingBySupplier}
                />
                <ListingsPagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  filters={filters}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
