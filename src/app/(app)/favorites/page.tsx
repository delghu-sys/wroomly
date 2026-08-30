import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import type { ListingWithDetails } from '@/types/database'
import { Heart } from 'lucide-react'
import { EmptyState } from '@/components/brand/EmptyState'

export const metadata: Metadata = { title: 'Saved Listings' }

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      listing_id,
      listings(
        *,
        listing_images(*),
        listing_amenities(*),
        swap_preferences(*),
        users:supplier_id(id, full_name, avatar_url, university, is_verified)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = ((favorites ?? []) as any[])
    .map(f => f.listings)
    .filter(Boolean) as ListingWithDetails[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {listings.length} {listings.length === 1 ? 'place' : 'places'} saved
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Saved <span className="italic font-light text-navy">listings.</span>
        </h1>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          className="animate-fade-up delay-100"
          icon={<Heart className="w-6 h-6" strokeWidth={1.75} />}
          title="Nothing saved"
          accent="yet."
          description="Tap the heart on any listing you like — it'll show up here so you can come back later."
          action={{ label: 'Browse listings', href: '/listings' }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map(listing => (
            <BrandListingCard
              key={listing.id}
              listing={listing}
              userId={user.id}
              isFavorited
            />
          ))}
        </div>
      )}
    </div>
  )
}
