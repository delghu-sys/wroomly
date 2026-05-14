import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { ListingWithDetails } from '@/types/database'
import Link from 'next/link'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { ListingsViewToggle } from '@/components/listings/ListingsViewToggle'
import { ListingsMap, type MapListing } from '@/components/listings/ListingsMap'
import { Button } from '@/components/ui/button'
import { BedDouble, Bell, DollarSign, CalendarRange, MapPin } from 'lucide-react'
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
  // Normalize to string | undefined
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

  // Sorting
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

  // Get user's favorites
  const favoriteIds = new Set<string>()
  if (authUser) {
    const { data: favs } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', authUser.id)
    for (const f of favs ?? []) favoriteIds.add(f.listing_id)
  }

  // Aggregate supplier ratings in one batch query
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

  return (
    <div>
      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full -z-10 blur-3xl opacity-50 animate-orbit"
          style={{ background: 'radial-gradient(closest-side, var(--maize-soft), transparent)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -left-32 w-[380px] h-[380px] rounded-full -z-10 blur-3xl opacity-40 animate-orbit"
          style={{ background: 'radial-gradient(closest-side, var(--navy-soft), transparent)', animationDelay: '4s' }}
          aria-hidden
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
                Ann Arbor · {typedListings.length} available
              </p>
              <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
                Find your <span className="italic font-light text-navy">next place.</span>
              </h1>
              {view === 'map' && mapListings.length !== typedListings.length && (
                <p className="text-ink-muted text-sm mt-2">
                  {mapListings.length} of {typedListings.length} pinned on the map
                </p>
              )}
            </div>
            <ListingsViewToggle view={view} />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0 animate-fade-up delay-100">
            <ListingsFilters
              neighborhoods={ANN_ARBOR_NEIGHBORHOODS as unknown as string[]}
              residences={ANN_ARBOR_RESIDENCES as unknown as string[]}
              propertyTypes={PROPERTY_TYPES as unknown as { value: string; label: string }[]}
              currentFilters={filters}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {typedListings.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-line bg-surface/50">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
                  <BedDouble className="w-6 h-6" />
                </div>
                <p className="font-display text-2xl text-ink">No exact matches yet</p>
                <p className="mt-2 text-sm text-ink-muted max-w-md mx-auto">
                  We don&apos;t have a listing that matches all your filters right now, but new places are added every day.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/listings">
                    <Button variant="outline" className="rounded-full h-10 px-5 text-sm">
                      Clear all filters
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-line max-w-md mx-auto">
                  <p className="text-sm font-medium text-ink mb-1">Try adjusting your search</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3 py-1.5">
                      <DollarSign className="w-3 h-3" /> Increase your budget
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3 py-1.5">
                      <CalendarRange className="w-3 h-3" /> Broaden your dates
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft bg-surface border border-line rounded-full px-3 py-1.5">
                      <MapPin className="w-3 h-3" /> Browse nearby areas
                    </span>
                  </div>
                </div>
              </div>
            ) : view === 'map' ? (
              <div className="animate-fade-in">
                <ListingsMap listings={mapListings} />
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
