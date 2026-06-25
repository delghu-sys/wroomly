import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { formatCents, getListingImageUrl } from '@/lib/utils/listing'
import { ArrowRight, MapPin, BedDouble, Sparkles } from 'lucide-react'
import { HomeHero } from '@/components/home/HomeHero'
import { CinematicMarquee } from '@/components/home/CinematicMarquee'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { TiltCard } from '@/components/home/TiltCard'
import { CardGallery } from '@/components/listings/CardGallery'
import { MagneticButton } from '@/components/home/MagneticButton'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export default async function HomePage() {
  const supabase = await createClient()

  // Detect a signed-in supplier so we can surface the AI importer
  // prominently for them (they're the side that lists places).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let isSupplier = false
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()
    const t = (profile as { user_type?: string } | null)?.user_type
    isSupplier = t === 'supplier' || t === 'admin'
  }

  const { data: featuredListings } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users(id, full_name, avatar_url, university)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(9)

  const listings = (featuredListings ?? []) as ListingWithDetails[]

  return (
    <div>
      {/* ── Hero — value prop + primary CTA ── */}
      <HomeHero />

      {/* ── Marquee — brand texture, one line ── */}
      <CinematicMarquee />

      {/* ── The marketplace, front and center ── */}
      <section
        className="py-20 sm:py-24 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, oklch(0.96 0.01 80) 0%, oklch(0.97 0.008 75) 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Supplier-only: AI importer — light card matching the section's
              card language (white surface, rounded-3xl, navy→maize CTA),
              with a maize accent so it stands out without clashing. */}
          {isSupplier && (
            <ScrollReveal>
              <Link
                href="/import-listing"
                className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-10 rounded-3xl border border-[oklch(0.84_0.17_85/0.5)] bg-white/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_2px_16px_oklch(0_0_0/0.05)] hover:shadow-[0_12px_40px_oklch(0_0_0/0.10)] transition-shadow duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-[oklch(0.84_0.17_85/0.16)] text-[oklch(0.45_0.13_85)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[oklch(0.45_0.13_85)] font-bold mb-1">
                    List your place
                  </p>
                  <h3 className="font-display text-xl tracking-tight text-ink leading-snug">
                    Just upload photos — we’ll draft your listing.
                  </h3>
                  <p className="text-[13.5px] text-ink-muted mt-1 leading-relaxed">
                    Add photos of your room (and screenshots of an existing post, if you
                    have one). Review and publish in minutes.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold group-hover:gap-3 transition-all">
                  Import my listing <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </ScrollReveal>
          )}

          <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted font-medium mb-3">
                Available now
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.0]">
                Sublets near campus,{' '}
                <span className="italic font-light text-navy">ready to book.</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.15} className="hidden sm:block">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98]"
              >
                Browse all listings <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollReveal>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing, i) => {
                const imageUrls = [...(listing.listing_images ?? [])]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(img => getListingImageUrl(img.storage_path))

                return (
                  <ScrollReveal key={listing.id} delay={0.05 * i}>
                    <TiltCard className="rounded-3xl">
                      <Link href={`/listings/${listing.id}`} className="block group">
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 overflow-hidden shadow-[0_2px_16px_oklch(0_0_0/0.05)] hover:shadow-[0_12px_40px_oklch(0_0_0/0.10)] transition-shadow duration-500">
                          <div className="relative aspect-[4/3] bg-[oklch(0.95_0.01_85)] overflow-hidden">
                            {imageUrls.length > 0 ? (
                              <CardGallery images={imageUrls} alt={listing.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BedDouble className="w-8 h-8 text-ink-muted/30" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span
                                className={
                                  listing.type === 'sublet'
                                    ? 'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur text-ink shadow-sm'
                                    : 'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)] shadow-sm'
                                }
                              >
                                {listing.type === 'sublet' ? 'Sublet' : 'Swap'}
                              </span>
                            </div>
                          </div>
                          <div className="p-5">
                            <h3 className="font-display text-lg tracking-tight text-ink line-clamp-1 group-hover:text-maize transition-colors duration-300">
                              {listing.title}
                            </h3>
                            {listing.neighborhood && (
                              <p className="text-sm text-ink-muted mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{listing.neighborhood}</span>
                              </p>
                            )}
                            {listing.type === 'sublet' && listing.price_per_month && (
                              <p className="font-display text-xl text-ink mt-3">
                                {formatCents(listing.price_per_month)}
                                <span className="font-sans text-sm text-ink-muted font-normal">
                                  {' '}
                                  /mo
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TiltCard>
                  </ScrollReveal>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-surface/60 p-12 text-center">
              <p className="font-display text-2xl text-ink">No listings yet</p>
              <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
                Listings are posted by verified U of M students. Check back soon — or
                be the first to list your place.
              </p>
              <Link
                href="/list-place"
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition"
              >
                List your place <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              View all listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Browse by neighborhood — navigation aid ── */}
      <section className="py-16 sm:py-20 border-t border-line bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted font-medium mb-3">
              Browse by neighborhood
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-ink max-w-2xl leading-[1.05]">
              Find a place{' '}
              <span className="italic font-light text-navy">where you want to live.</span>
            </h2>
          </ScrollReveal>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {NEIGHBORHOOD_CONTENT.map(n => (
              <Link
                key={n.slug}
                href={`/ann-arbor/${n.slug}`}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-medium bg-surface border border-line text-ink-soft hover:border-maize/50 hover:text-ink hover:-translate-y-0.5 transition-all duration-300"
              >
                <MapPin className="w-3.5 h-3.5 text-[oklch(0.45_0.13_85)]" />
                {n.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Slim supplier CTA — a marketplace needs supply ── */}
      <section
        className="relative py-24 sm:py-28 overflow-hidden isolate"
        style={{ background: 'oklch(0.22 0.075 256)' }}
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 80% at 20% 30%, oklch(0.20 0.06 265) 0%, transparent 70%), radial-gradient(40% 60% at 80% 70%, oklch(0.84 0.17 85 / 0.06) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("${NOISE_SVG}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 200px',
          }}
          aria-hidden
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight text-white leading-[1.0]">
              Leaving for the summer?{' '}
              <span className="italic font-light text-[oklch(0.84_0.17_85)]">
                List your place free.
              </span>
            </h2>
            <p className="mt-5 text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
              Verified U of M students, private messaging, zero Craigslist
              sketch. List in minutes.
            </p>
            <div className="mt-8">
              <Link href="/list-place">
                <MagneticButton variant="primary" showArrow>
                  List your place
                </MagneticButton>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
