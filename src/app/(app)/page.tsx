import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
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
      ${PUBLIC_LISTING_COLUMNS},
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, avatar_url, university, is_verified)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  const listings = (newest ?? []) as unknown as ListingWithDetails[]

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
              className="
                group inline-flex items-center gap-1.5 h-9 px-4 rounded-full shrink-0
                border border-line bg-white text-[0.8125rem] font-semibold text-navy
                shadow-[0_1px_3px_oklch(0_0_0/0.05)]
                transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                hover:border-navy/30 hover:shadow-[0_4px_16px_oklch(0_0_0/0.10)] hover:-translate-y-px
              "
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
            {listings.map((listing, i) => (
              <div key={listing.id} className="w-[230px] shrink-0 snap-start min-[800px]:w-auto">
                {/* First card's cover is the homepage LCP on mobile —
                    preload it instead of queuing behind the JS. */}
                <BrandListingCard listing={listing} userId={user?.id ?? null} priorityImage={i === 0} />
              </div>
            ))}
          </div>

          {/* Second, more prominent "see all" — right under the grid, for
              anyone who scrolled past the header link above. */}
          <div className="flex justify-center mt-8 px-[1.375rem]">
            <Link
              href="/listings"
              className="
                group inline-flex items-center gap-2 h-12 px-7 rounded-full
                bg-navy text-white font-semibold text-[0.9375rem]
                transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                hover:-translate-y-px hover:shadow-[0_8px_28px_oklch(0.22_0.075_256/0.30)]
              "
            >
              See all listings
              <ArrowRight
                size={15}
                strokeWidth={2.5}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </section>
      )}

      {/* ── Lister CTA — secondary path. Styled as a soft card sitting on the
          same cream background as the listings section above (no hard
          border-y banner seam), with the same navy/maize "AI" icon badge
          used on /start-listing's import card, so it reads as part of the
          same visual system instead of a bolted-on strip. ── */}
      <section aria-label="List your place" className="bg-background px-6 pb-16 sm:pb-20">
        <div
          className="
            max-w-[40rem] mx-auto rounded-[1.75rem] border border-line bg-white
            shadow-[0_4px_28px_oklch(0.18_0.025_255/0.06)]
            px-7 py-8 sm:px-9
            flex flex-col items-center text-center gap-5
            min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:text-left min-[680px]:gap-7
          "
        >
          <div className="flex flex-col items-center gap-4 min-[680px]:flex-row min-[680px]:flex-1">
            <span
              className="shrink-0 inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-navy text-maize"
              style={{ boxShadow: '0 6px 18px oklch(0.22 0.075 256 / 0.25)' }}
            >
              <Sparkles className="w-5 h-5" strokeWidth={2} />
            </span>
            <div>
              <h3 className="font-display text-[1.1875rem] font-bold tracking-[-0.032em] text-ink leading-tight">
                Subletting your place?
              </h3>
              <p className="text-[0.9rem] text-ink-muted leading-[1.6] mt-1">
                List it free in 60 seconds — screenshot your existing post and our AI does the rest.
              </p>
            </div>
          </div>
          <Link
            href="/list-place"
            className="
              shrink-0 inline-flex items-center gap-[0.45rem] h-[2.875rem] px-6 rounded-full
              bg-navy text-white font-bold text-[0.9375rem] whitespace-nowrap
              transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:-translate-y-px hover:shadow-[0_6px_24px_oklch(0.22_0.075_256/0.28),0_0_18px_oklch(0.86_0.17_92/0.20)]
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
