import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ShieldCheck, MessageSquare, CreditCard, Star, ArrowRight, Sparkles } from 'lucide-react'
import { ListingCard } from '@/components/listings/ListingCard'
import type { ListingWithDetails } from '@/types/database'

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

  return (
    <div>
      {/* Hero — editorial, warm, refined */}
      <section className="relative overflow-hidden">
        {/* Animated background photo (residence building) */}
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center animate-ken-burns will-change-transform"
          style={{ backgroundImage: "url('/hero-building.jpg')" }}
          aria-hidden
        />
        {/* Readability layer: warm tint + soft fade to background at bottom */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(180deg, oklch(1 0 0 / 0.78) 0%, oklch(1 0 0 / 0.65) 45%, oklch(1 0 0 / 0.88) 100%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-grain opacity-60" aria-hidden />
        <div
          className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full -z-10 blur-3xl opacity-40"
          style={{ background: 'radial-gradient(closest-side, var(--maize-soft), transparent)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -left-32 w-[480px] h-[480px] rounded-full -z-10 blur-3xl opacity-30"
          style={{ background: 'radial-gradient(closest-side, var(--navy-soft), transparent)' }}
          aria-hidden
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20 sm:pb-32">
          <div className="max-w-3xl">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-ink-soft shadow-soft">
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[oklch(0.7_0.14_142)] animate-ping-soft text-[oklch(0.7_0.14_142)]">
                <span className="absolute inset-0 rounded-full bg-[oklch(0.7_0.14_142)]" />
              </span>
              <span>U-M verified marketplace</span>
              <span className="w-px h-3 bg-line mx-1" aria-hidden />
              <Sparkles className="w-3.5 h-3.5 text-[oklch(0.7_0.14_92)]" />
              <span>AI-moderated</span>
            </div>

            <h1 className="animate-fade-up delay-100 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] tracking-tight text-ink mt-6 text-balance">
              Make room for
              <br />
              <span className="italic font-light text-navy">connection.</span>
            </h1>

            <p className="animate-fade-up delay-200 mt-7 text-lg sm:text-xl text-ink-soft leading-relaxed max-w-2xl text-pretty">
              Sublet or swap your Ann&nbsp;Arbor apartment with verified U&nbsp;of&nbsp;M students.
              Secure payments, in-app messaging, and not a single Craigslist email.
            </p>

            <div className="animate-fade-up delay-300 mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/listings">
                <Button
                  size="lg"
                  className="h-12 px-6 rounded-full bg-navy text-white hover:bg-navy/90 ease-smooth transition-all shadow-[0_8px_24px_oklch(0.27_0.07_257_/_0.25)] hover:shadow-[0_10px_32px_oklch(0.27_0.07_257_/_0.35)] hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  Browse listings
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 rounded-full border-ink/15 bg-surface/60 backdrop-blur hover:bg-surface hover:border-ink/30 ease-smooth transition-all w-full sm:w-auto"
                >
                  List your place
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="animate-fade-up delay-400 mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-muted">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-navy" />
                <span>@umich.edu verified</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-line" aria-hidden />
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-navy" />
                <span>Escrowed payments</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-line" aria-hidden />
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-navy" />
                <span>Private messaging</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Residences marquee — slow drift band */}
      <div className="relative border-y border-line bg-surface/60 backdrop-blur overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        <div className="flex animate-marquee whitespace-nowrap py-4 will-change-transform">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-10 px-5 shrink-0">
              {[
                'The Standard',
                'Foundry Lofts',
                'Six11',
                'Landmark',
                'Hub William',
                'Vic Village',
                'Saga',
                'The Yard',
                'The Legacy',
                'Verve',
              ].map(name => (
                <span
                  key={`${dup}-${name}`}
                  className="font-display text-sm tracking-tight text-ink-muted flex items-center gap-10"
                >
                  {name}
                  <span className="w-1 h-1 rounded-full bg-maize" aria-hidden />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-3">
              How it works
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
              Three steps from search<br /> to <span className="italic font-light">move-in day.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: ShieldCheck,
                title: 'Get verified',
                desc: 'Suppliers verify with @umich.edu. Consumers can sign up with any email address.',
              },
              {
                step: '02',
                icon: MessageSquare,
                title: 'Message directly',
                desc: 'Send an inquiry, get accepted, and chat in-app. No phone numbers exchanged until you choose.',
              },
              {
                step: '03',
                icon: CreditCard,
                title: 'Pay securely',
                desc: 'Deposit and first month held in escrow via Stripe. Funds release on move-in day.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="lift glow-warm sheen group relative bg-surface rounded-3xl p-8 border border-line"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="relative w-12 h-12 rounded-2xl bg-navy-soft text-navy flex items-center justify-center ease-smooth transition-all duration-500 group-hover:bg-navy group-hover:text-white group-hover:rotate-[-6deg] group-hover:scale-105">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-display text-3xl text-ink-muted/40 italic">{step}</span>
                </div>
                <h3 className="font-display text-2xl tracking-tight text-ink mb-3">{title}</h3>
                <p className="text-ink-soft leading-relaxed">{desc}</p>
                <div
                  className="absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-maize to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      {featuredListings && featuredListings.length > 0 && (
        <section className="py-24 border-t border-line bg-[oklch(0.97_0.008_85)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-3">
                  Available now
                </p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
                  Fresh listings near campus
                </h2>
              </div>
              <Link href="/listings" className="hidden sm:block">
                <Button
                  variant="ghost"
                  className="rounded-full hover:bg-navy hover:text-white ease-smooth transition-all"
                >
                  View all <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(featuredListings as ListingWithDetails[]).map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            <div className="text-center mt-10 sm:hidden">
              <Link href="/listings">
                <Button variant="outline" className="rounded-full">View all listings</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA — animated gradient mesh */}
      <section className="relative py-28 sm:py-32 overflow-hidden bg-navy text-white isolate">
        {/* Drifting gradient mesh */}
        <div
          className="absolute inset-0 -z-10 animate-gradient opacity-90"
          style={{
            background:
              'radial-gradient(60% 80% at 15% 25%, oklch(0.36 0.08 257) 0%, transparent 60%),' +
              'radial-gradient(50% 70% at 85% 75%, oklch(0.4 0.1 280) 0%, transparent 60%),' +
              'radial-gradient(40% 60% at 65% 20%, oklch(0.45 0.09 92 / 0.35) 0%, transparent 65%),' +
              'linear-gradient(180deg, oklch(0.24 0.07 257), oklch(0.22 0.06 257))',
          }}
          aria-hidden
        />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />
        {/* Floating decorative blobs */}
        <div
          className="absolute -top-20 left-[12%] w-40 h-40 rounded-full blur-3xl animate-float opacity-50 -z-10"
          style={{ background: 'oklch(0.86 0.17 92 / 0.35)' }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 right-[8%] w-56 h-56 rounded-full blur-3xl animate-float-slow opacity-40 -z-10"
          style={{ background: 'oklch(0.7 0.14 280 / 0.5)' }}
          aria-hidden
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-maize font-medium mb-5">
            <span className="w-8 h-px bg-maize/60" aria-hidden />
            For suppliers
            <span className="w-8 h-px bg-maize/60" aria-hidden />
          </p>
          <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl tracking-tight text-balance leading-[1.02]">
            Going away for a semester?
            <br />
            <span className="italic font-light text-maize">We&rsquo;ll handle the rest.</span>
          </h2>
          <p className="mt-7 text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            List your apartment in minutes. We handle verification, payments, and messaging —
            so you can focus on your study abroad, internship, or co-op.
          </p>
          <Link href="/sign-up" className="inline-block mt-10">
            <Button
              size="lg"
              className="sheen h-13 px-8 rounded-full bg-maize text-navy hover:bg-maize/90 font-semibold ease-smooth transition-all hover:-translate-y-0.5 shadow-[0_10px_40px_oklch(0.86_0.17_92_/_0.4)]"
            >
              List your place — it&rsquo;s free
              <ArrowRight className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust */}
      <section className="py-24 border-t border-line" id="trust">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-3">
                Trust &amp; safety
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink mb-8 text-balance">
                Built for students,<br />
                <span className="italic font-light">protected by design.</span>
              </h2>
              <ul className="space-y-4">
                {[
                  'Suppliers verified via @umich.edu email',
                  'Listings reviewed before going live',
                  'Payments held in escrow — released on move-in',
                  'In-app messaging keeps personal info private',
                  'Report any listing or user to moderation',
                  'Mutual reviews after every stay',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-ink-soft">
                    <ShieldCheck className="w-5 h-5 text-navy mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div
                className="absolute -inset-8 rounded-[2.5rem] -z-10 blur-3xl opacity-60 animate-float-slow"
                style={{ background: 'radial-gradient(closest-side, var(--maize-soft), transparent)' }}
                aria-hidden
              />
              <div className="relative bg-surface rounded-3xl p-10 border border-line shadow-soft overflow-hidden">
                {/* Decorative oversized quote mark */}
                <span
                  className="absolute -top-6 -right-2 font-display text-[10rem] leading-none text-maize/15 select-none pointer-events-none"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <div className="relative flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-maize text-maize" />
                  ))}
                </div>
                <blockquote className="relative font-display text-2xl sm:text-3xl tracking-tight text-ink leading-snug mb-8 text-balance">
                  &ldquo;Found a sublet for my summer internship in three&nbsp;days. Way better
                  than scrolling Facebook groups and texting strangers.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-soft text-navy flex items-center justify-center font-semibold">
                    AT
                  </div>
                  <div>
                    <p className="font-medium text-ink">Alex T.</p>
                    <p className="text-sm text-ink-muted">U of M, Class of &rsquo;25</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
