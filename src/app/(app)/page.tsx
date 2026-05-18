import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { formatCents, getListingImageUrl } from '@/lib/utils/listing'
import { ShieldCheck, Star, ArrowRight, MapPin, BedDouble, Check } from 'lucide-react'
import { HomeHero } from '@/components/home/HomeHero'
import { CinematicMarquee } from '@/components/home/CinematicMarquee'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { TiltCard } from '@/components/home/TiltCard'
import { MagneticButton } from '@/components/home/MagneticButton'

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

const steps = [
  {
    num: '01',
    icon: ShieldCheck,
    title: 'Get verified',
    desc: 'Suppliers verify with @umich.edu. Consumers can sign up with any email address.',
  },
  {
    num: '02',
    icon: ShieldCheck,
    title: 'Message directly',
    desc: 'Send an inquiry, get accepted, and chat in-app. No phone numbers exchanged until you choose.',
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Pay securely',
    desc: 'Deposit and first month held in escrow via Stripe. Funds release on move-in day.',
  },
]

const trustItems = [
  'Suppliers verified via @umich.edu email',
  'Listings reviewed before going live',
  'Payments held in escrow — released on move-in',
  'In-app messaging keeps personal info private',
  'Report any listing or user to moderation',
  'Mutual reviews after every stay',
]

export default async function HomePage() {
  const supabase = await createClient()

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
    .limit(6)

  const listings = (featuredListings ?? []) as ListingWithDetails[]

  return (
    <div>
      {/* ── Hero ── */}
      <HomeHero />

      {/* ── Marquee ── */}
      <CinematicMarquee />

      {/* ── How it works ── */}
      <section className="py-28 sm:py-32" style={{ background: 'oklch(0.97 0.008 75)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted font-medium mb-4">
              How it works
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink max-w-2xl leading-[0.95]">
              Three steps from search
              <br />
              to <span className="italic font-light text-maize">move-in day.</span>
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {steps.map(({ num, icon: Icon, title, desc }, i) => (
              <ScrollReveal key={num} delay={0.1 + i * 0.12}>
                <div className="group bg-white rounded-3xl p-8 border border-line hover:border-maize/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_oklch(0_0_0/0.07)] h-full">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-display text-4xl text-ink-muted/20 italic group-hover:text-maize/40 transition-colors duration-500">
                      {num}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl tracking-tight text-ink mb-3">{title}</h3>
                  <p className="text-ink-soft leading-relaxed">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fresh listings ── */}
      {listings.length > 0 && (
        <section
          className="py-24 sm:py-28 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, oklch(0.96 0.01 80) 0%, oklch(0.97 0.008 75) 100%)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-14 gap-6 flex-wrap">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted font-medium mb-4">
                  Available now
                </p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink">
                  Fresh listings near campus
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={0.2} className="hidden sm:block">
                <Link
                  href="/listings"
                  className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing, i) => {
                const coverImage = listing.listing_images
                  ?.sort((a, b) => a.display_order - b.display_order)
                  .at(0)
                const imageUrl = coverImage
                  ? getListingImageUrl(coverImage.storage_path)
                  : null

                return (
                  <ScrollReveal key={listing.id} delay={0.05 * i}>
                    <TiltCard className="rounded-3xl">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="block group"
                      >
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 overflow-hidden shadow-[0_2px_16px_oklch(0_0_0/0.05)] hover:shadow-[0_12px_40px_oklch(0_0_0/0.10)] transition-shadow duration-500">
                          <div className="relative aspect-[4/3] bg-[oklch(0.95_0.01_85)] overflow-hidden">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={listing.title}
                                fill
                                className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
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
                                    : 'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)] shadow-sm'
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
                                <span className="truncate">
                                  {listing.neighborhood}
                                </span>
                              </p>
                            )}
                            {listing.type === 'sublet' &&
                              listing.price_per_month && (
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
      )}

      {/* ── For suppliers CTA ── */}
      <section
        className="relative py-32 sm:py-40 overflow-hidden isolate"
        style={{ background: 'oklch(0.10 0.02 260)' }}
      >
        {/* Mesh */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 80% at 20% 30%, oklch(0.20 0.06 265) 0%, transparent 70%), radial-gradient(40% 60% at 80% 70%, oklch(0.84 0.17 85 / 0.06) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        {/* Noise */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("${NOISE_SVG}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 200px',
          }}
          aria-hidden
        />
        {/* Decorative blobs */}
        <div
          className="absolute -top-20 left-[12%] w-40 h-40 rounded-full blur-3xl animate-float opacity-40 -z-10"
          style={{ background: 'oklch(0.84 0.17 85 / 0.3)' }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 right-[8%] w-56 h-56 rounded-full blur-3xl animate-float-slow opacity-25 -z-10"
          style={{ background: 'oklch(0.5 0.1 280 / 0.5)' }}
          aria-hidden
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-medium mb-6">
              <span className="w-8 h-px bg-[oklch(0.84_0.17_85_/_0.4)]" aria-hidden />
              For suppliers
              <span className="w-8 h-px bg-[oklch(0.84_0.17_85_/_0.4)]" aria-hidden />
            </p>
            <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white leading-[0.95]">
              Going away for a semester?
              <br />
              <span className="italic font-light text-[oklch(0.84_0.17_85)]">
                We&rsquo;ll handle the rest.
              </span>
            </h2>
            <p className="mt-8 text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              List your apartment in minutes. We handle verification, payments,
              and messaging — so you can focus on your study abroad, internship,
              or co-op.
            </p>
            <div className="mt-10">
              <Link href="/sign-up">
                <MagneticButton variant="primary" showArrow>
                  List your place — it&rsquo;s free
                </MagneticButton>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Trust & Testimonial ── */}
      <section className="py-24 sm:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted font-medium mb-4">
                Trust &amp; safety
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink mb-10 leading-[0.95]">
                Built for students,
                <br />
                <span className="italic font-light text-maize">
                  protected by design.
                </span>
              </h2>
              <ul className="space-y-4">
                {trustItems.map(item => (
                  <li key={item} className="flex items-center gap-3 text-ink-soft">
                    <div className="w-6 h-6 rounded-full bg-maize/10 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-maize" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="relative bg-surface rounded-3xl p-10 border border-line overflow-hidden shadow-soft">
                <span
                  className="absolute -top-6 -right-2 font-display text-[10rem] leading-none text-maize/10 select-none pointer-events-none"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <div className="relative flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-maize text-maize" />
                  ))}
                </div>
                <blockquote className="relative font-display text-2xl sm:text-3xl tracking-tight text-ink leading-snug mb-8">
                  &ldquo;Found a sublet for my summer internship in
                  three&nbsp;days. Way better than scrolling Facebook groups and
                  texting strangers.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[oklch(0.10_0.02_260)] text-white flex items-center justify-center font-semibold text-sm">
                    AT
                  </div>
                  <div>
                    <p className="font-medium text-ink">Alex T.</p>
                    <p className="text-sm text-ink-muted">
                      U of M, Class of &rsquo;25
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
