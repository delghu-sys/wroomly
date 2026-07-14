import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import type { ListingWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

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
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-white/55 backdrop-blur-sm">
          <div
            className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{
              background: 'oklch(0.22 0.075 256)',
              color: 'oklch(0.84 0.17 85)',
            }}
          >
            <Heart className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <p className="font-display text-2xl text-ink">
            Nothing saved{' '}
            <span className="italic font-light text-[oklch(0.45_0.13_85)]">
              yet.
            </span>
          </p>
          <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
            Tap the heart on any listing you like — it&apos;ll show up here so
            you can come back later.
          </p>
          <Link href="/listings">
            <Button className="press rounded-full bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)] hover:shadow-[0_8px_24px_oklch(0.84_0.17_85/0.35)] h-11 px-6 font-semibold transition-shadow duration-500">
              Browse listings
            </Button>
          </Link>
        </div>
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
