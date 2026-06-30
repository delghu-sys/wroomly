import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { HomeHero } from '@/components/home/HomeHero'
import { BrandListingCard } from '@/components/listings/BrandListingCard'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Newest real listings for the "Newest listings" strip. Same shape the
  // BrandListingCard expects; `users:supplier_id` disambiguates the host FK
  // (listings has two FKs to users since migration 025).
  const { data: newest } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, avatar_url, university)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  const listings = (newest ?? []) as ListingWithDetails[]

  return (
    <div>
      {/* ── Hero — search-first, full viewport ── */}
      <HomeHero />

      {/* ── Newest listings strip ── */}
      {listings.length > 0 && (
        <section aria-label="Newest listings" className="bg-background pt-[3.25rem] pb-[3.5rem] overflow-hidden">
          <div className="flex items-baseline justify-between px-[1.375rem] min-[800px]:px-8 mb-[1.375rem]">
            <span className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.09em] text-ink-muted">
              Newest listings
            </span>
            <Link
              href="/listings"
              className="group inline-flex items-center gap-[0.3rem] text-[0.875rem] font-semibold text-navy hover:opacity-75 transition-opacity"
            >
              See all
              <ArrowRight
                size={13}
                strokeWidth={2.5}
                className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>

          {/* Mobile: horizontal snap-scroll. Desktop (≥800px): 4-col grid. */}
          <div
            className="
              flex gap-4 overflow-x-auto px-[1.375rem] pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden
              min-[800px]:grid min-[800px]:grid-cols-4 min-[800px]:gap-4 min-[800px]:px-8 min-[800px]:overflow-visible
            "
          >
            {listings.map(listing => (
              <div key={listing.id} className="w-[230px] shrink-0 snap-start min-[800px]:w-auto">
                <BrandListingCard listing={listing} userId={user?.id ?? null} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Lister CTA — secondary path ── */}
      <section
        aria-label="List your place"
        className="bg-white border-y border-line px-6 py-11"
      >
        <div className="max-w-[40rem] mx-auto flex flex-col items-center text-center gap-3 min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:text-left min-[680px]:gap-0">
          <div className="min-[680px]:flex-1 min-[680px]:pr-8">
            <h3 className="font-display text-[1.1875rem] font-bold tracking-[-0.032em] text-ink leading-tight">
              Subletting your place?
            </h3>
            <p className="text-[0.9rem] text-ink-muted leading-[1.6] mt-1">
              List it free in 60 seconds — screenshot your existing post and our AI does the rest.
            </p>
          </div>
          <Link
            href="/list-place"
            className="
              shrink-0 inline-flex items-center gap-[0.45rem] h-[2.875rem] px-6 rounded-full
              bg-navy text-white font-bold text-[0.9375rem] whitespace-nowrap
              transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:-translate-y-px hover:shadow-[0_6px_24px_oklch(0.22_0.075_256/0.28)]
            "
          >
            List my place
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  )
}
