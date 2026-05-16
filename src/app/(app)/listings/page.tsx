import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { ListingWithDetails } from '@/types/database'
import Link from 'next/link'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { ListingsViewToggle } from '@/components/listings/ListingsViewToggle'
import { ListingsMap, type MapListing } from '@/components/listings/ListingsMap'
import { ListingsSearch } from '@/components/listings/ListingsSearch'
import { ListingsQuickFilters } from '@/components/listings/ListingsQuickFilters'
import { MobileFilterSheet } from '@/components/listings/MobileFilterSheet'
import { Button } from '@/components/ui/button'
import { BedDouble, DollarSign, CalendarRange, MapPin, Sparkles } from 'lucide-react'
import {
  ANN_ARBOR_NEIGHBORHOODS,
  ANN_ARBOR_RESIDENCES,
  PROPERTY_TYPES,
} from '@/lib/constants'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export const metadata: Metadata = { title: 'Browse Listings' }

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
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%,neighborhood.ilike.%${filters.q}%,residence_name.ilike.%${filters.q}%`)
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

  const favoriteIds = new Set<string>()
  if (authUser) {
    const { data: favs } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', authUser.id)
    for (const f of favs ?? []) favoriteIds.add(f.listing_id)
  }

  const supplierIds = Array.from(
    new Set(((listings ?? []) as ListingWithDetails[]).map(l => l.supplier_id))
  )
  const ratingBySupplier: Record<string, { avg: number; count: number }> = {}
  if (supplierIds.length > 0) {
    const { data: ratingRows } = await supabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', supplierIds)
    const buckets: Record<string, number[]> = {}
    for (const r of (ratingRows ?? []) as { reviewee_id: string; rating: number }[]) {
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
    const image_url = firstImage
      ? `${SUPA_URL}/storage/v1/object/public/listing-images/${firstImage.storage_path}`
      : null
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
    <div className="min-h-screen">
      {/* Hero — prominent search */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-soft/60 via-background to-background border-b border-line">
        {/* Decorative elements */}
        <div
          className="absolute -top-20 right-[10%] w-[500px] h-[500px] rounded-full -z-10 blur-3xl opacity-40 animate-orbit"
          style={{ background: 'radial-gradient(closest-side, oklch(0.86 0.17 92 / 0.3), transparent)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full -z-10 blur-3xl opacity-30 animate-orbit"
          style={{ background: 'radial-gradient(closest-side, oklch(0.27 0.07 257 / 0.15), transparent)', animationDelay: '6s' }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(oklch(0.27 0.07 257 / 0.4) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8 sm:pb-10">
          <div className="animate-fade-up max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-surface/70 backdrop-blur px-3 py-1 text-xs font-medium text-ink-muted mb-4">
              <Sparkles className="w-3.5 h-3.5 text-maize" />
              <span>Ann Arbor · {typedListings.length} places available</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink text-balance leading-[1.02]">
              Find your <span className="italic font-light text-navy">next place.</span>
            </h1>
            <p className="text-ink-soft mt-3 text-base sm:text-lg max-w-lg">
              Sublets and swaps from verified U&nbsp;of&nbsp;M students. Secure payments, real listings.
            </p>
          </div>

          {/* Search + view toggle row */}
          <div className="animate-fade-up delay-100 mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <ListingsSearch currentQuery={filters.q} />
            <ListingsViewToggle view={view} />
          </div>

          {/* Quick type pills */}
          <div className="animate-fade-up delay-200 mt-5 flex items-center gap-2 flex-wrap">
            {[
              { label: 'All', value: undefined },
              { label: 'Sublets', value: 'sublet' },
              { label: 'Swaps', value: 'swap' },
            ].map(opt => {
              const isActive = (filters.type ?? undefined) === opt.value
              return (
                <Link
                  key={opt.label}
                  href={opt.value ? `/listings?type=${opt.value}` : '/listings'}
                  className={`inline-flex items-center h-8 px-4 rounded-full text-sm font-medium ease-smooth transition-all ${
                    isActive
                      ? 'bg-navy text-white shadow-[0_2px_12px_oklch(0.27_0.07_257_/_0.25)]'
                      : 'bg-surface border border-line text-ink-soft hover:text-ink hover:border-navy/20'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
            <span className="w-px h-5 bg-line mx-1 hidden sm:block" aria-hidden />
            <Link
              href={filters.furnished === 'true' ? '/listings' : '/listings?furnished=true'}
              className={`inline-flex items-center h-8 px-4 rounded-full text-sm font-medium ease-smooth transition-all ${
                filters.furnished === 'true'
                  ? 'bg-navy text-white shadow-[0_2px_12px_oklch(0.27_0.07_257_/_0.25)]'
                  : 'bg-surface border border-line text-ink-soft hover:text-ink hover:border-navy/20'
              }`}
            >
              Furnished
            </Link>
            <Link
              href={filters.pets === 'true' ? '/listings' : '/listings?pets=true'}
              className={`inline-flex items-center h-8 px-4 rounded-full text-sm font-medium ease-smooth transition-all ${
                filters.pets === 'true'
                  ? 'bg-navy text-white shadow-[0_2px_12px_oklch(0.27_0.07_257_/_0.25)]'
                  : 'bg-surface border border-line text-ink-soft hover:text-ink hover:border-navy/20'
              }`}
            >
              Pets OK
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Active filters + results count bar */}
        <div className="mb-5 animate-fade-up flex items-center gap-3 flex-wrap">
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
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block lg:w-[280px] shrink-0 animate-fade-up delay-100">
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
              <div className="animate-fade-up text-center py-20 rounded-3xl border border-dashed border-line bg-gradient-to-b from-surface to-background">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-5">
                  <BedDouble className="w-7 h-7" />
                </div>
                <p className="font-display text-2xl sm:text-3xl text-ink">No exact matches yet</p>
                <p className="mt-3 text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
                  We don&apos;t have a listing that matches all your filters right now, but new places are added every day.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/listings">
                    <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6 shadow-[0_8px_24px_oklch(0.27_0.07_257_/_0.22)]">
                      Clear all filters
                    </Button>
                  </Link>
                </div>

                <div className="mt-10 pt-6 border-t border-line max-w-md mx-auto">
                  <p className="text-sm font-display text-ink mb-3">Try adjusting your search</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3.5 py-2">
                      <DollarSign className="w-3 h-3 text-navy" /> Increase your budget
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3.5 py-2">
                      <CalendarRange className="w-3 h-3 text-navy" /> Broaden your dates
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3.5 py-2">
                      <MapPin className="w-3 h-3 text-navy" /> Browse nearby areas
                    </span>
                  </div>
                </div>
              </div>
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
              <div className="stagger-reveal grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {typedListings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    userId={authUser?.id ?? null}
                    isFavorited={favoriteIds.has(listing.id)}
                    supplierRating={ratingBySupplier[listing.supplier_id]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
