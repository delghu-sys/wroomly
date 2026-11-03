import Link from 'next/link'
import Image from '@/components/ui/StorageImage'
import type { Metadata } from 'next'
import { ArrowRight, BedDouble, Footprints, ShieldCheck, Sofa, CalendarRange, Plane } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
import { getListingImageUrl } from '@/lib/utils/listing'
import { walkToCampus } from '@/lib/campus'
import type { ListingWithDetails } from '@/types/database'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { LiveBadge } from '@/components/brand/LiveBadge'
import { MagneticButton } from '@/components/home/MagneticButton'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { PrintButton } from '@/components/exchange/PrintButton'

const TITLE = 'Housing in Ann Arbor for exchange students at Michigan'
const DESCRIPTION =
  'A one-page overview for exchange offices and students: how to find a furnished room or apartment in Ann Arbor for just the semester you are at the University of Michigan.'

export const metadata: Metadata = {
  title: 'Housing for exchange students at Michigan',
  description: DESCRIPTION,
  alternates: { canonical: '/exchange' },
  openGraph: { title: `${TITLE} | Wroomly`, description: DESCRIPTION, images: ['/og-default.png'] },
}

/**
 * The overview that exchange offices forward or print, and the link our
 * outreach emails point to.
 *
 * Every claim in the static copy is one the site already makes elsewhere
 * (About, the international-student guide, Trust & Safety). It says nothing
 * about prices, listing counts or partnerships, because this page cannot keep
 * those current by hand. The one live part, the strip of furnished listings,
 * is read from the database on each request and disappears when there are too
 * few to show honestly.
 *
 * On screen it is a branded page. When printed or saved as a PDF it becomes a
 * plain one-page sheet: browsers drop background colours, so a dark layout
 * would print as white text on white paper.
 */

const WHY = [
  {
    word: 'Semester-long.',
    title: 'A place for just your semester',
    body: 'Most Ann Arbor leases run twelve months. On Wroomly, current Michigan students sublet their room or apartment while they are away, so the dates can match an exchange term instead of a full lease.',
  },
  {
    word: 'Furnished.',
    title: 'Land and unpack',
    body: 'Arriving with two suitcases, a furnished place saves you from buying furniture for a few months. Filter listings by dates and by furnished.',
  },
  {
    word: 'Verified.',
    title: 'Know who you are renting from',
    body: 'Michigan students who sign in with their @umich.edu Google account carry a blue check. Listings are reviewed, and conversations stay on Wroomly.',
  },
]

const TIMING = [
  { arrive: 'Arriving in the fall', start: 'Start in the spring', why: 'Housing is tightest for the fall term, so look early.' },
  { arrive: 'Arriving in January', start: 'Start by November', why: 'Sublets move on your schedule: two to four months before arrival is a good window.' },
]

const STEPS = [
  ['Browse and filter', 'Pick your dates and filter for furnished. Save a search to be told about new listings.'],
  ['Message the host on Wroomly', 'Ask your questions in the app, and look for the blue check on the host.'],
  ['See it before you commit', 'Ask for a live video walkthrough of the actual apartment, then get the sublease, and the landlord’s consent, in writing.'],
  ['Pay safely', 'A deposit is capped at one and a half months’ rent under Michigan law. Never pay by wire, gift card or crypto: use a traceable method.'],
]

const GUIDES = [
  ['Housing at UMich as an international student', '/guides/international-student-housing-guide-umich'],
  ['How to avoid sublet scams in Ann Arbor', '/guides/how-to-avoid-sublet-scams-ann-arbor'],
  ['Winter semester sublets: the January move-in playbook', '/guides/winter-semester-sublets-ann-arbor'],
  ['The housing timeline: when to look, sign and sublet', '/guides/umich-off-campus-housing-timeline'],
]

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
/** Mar … Jan, the stretch in which anyone planning an exchange starts looking. */
const LOOKING_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

/** Furnished, active listings with a photo, newest first. Never throws:
 *  the page must still open if the database is slow or down. */
async function furnishedNow(): Promise<ListingWithDetails[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select(`${PUBLIC_LISTING_COLUMNS}, listing_images(*)`)
      .eq('status', 'active')
      .eq('furnished', true)
      .order('created_at', { ascending: false })
      .limit(12)
    const rows = (data ?? []) as unknown as ListingWithDetails[]
    return rows.filter(l => (l.listing_images ?? []).length > 0).slice(0, 4)
  } catch {
    return []
  }
}

/** The one idea on the page, drawn: a year-long lease against the months you are actually here. */
function LeaseGap() {
  return (
    <div
      className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 sm:p-8 shadow-overlay"
      role="img"
      aria-label="A twelve-month lease covers the whole year. A Wroomly sublet covers only the four months of a January semester."
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 font-medium">Why a lease does not fit</p>

      <div className="mt-6 grid grid-cols-12 gap-[3px] text-center text-[10px] font-medium text-white/40 tabular-nums">
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>

      <div className="mt-2 space-y-3">
        <div className="grid grid-cols-12 gap-[3px]">
          <div className="col-span-12 h-12 rounded-xl bg-white/[0.10] border border-white/10 flex items-center justify-between px-4">
            <span className="text-[13px] text-white/75">Typical lease</span>
            <span className="text-[12px] text-white/45">12 months</span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-[3px]">
          <div className="col-span-4 h-12 rounded-xl bg-maize-bright text-navy-deep flex items-center gap-2 px-3 sm:px-4 shadow-glow-maize">
            <ShieldCheck className="hidden sm:block w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[13px] font-semibold whitespace-nowrap">Your term</span>
          </div>
          <div
            className="col-span-8 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center px-3"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, oklch(1 0 0 / 0.05) 0 6px, transparent 6px 12px)' }}
          >
            <span className="text-[12px] text-white/45 text-center leading-tight">Months you are not here</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-white/60 leading-relaxed max-w-sm">
        A January arrival, as an example. A sublet runs for the months you are here, not the twelve a landlord asks for.
      </p>
    </div>
  )
}

/** A start-looking window and an arrival marker on the Mar–Jan strip. */
function TimingStrip({ from, to, arrive }: { from: number; to: number; arrive: number }) {
  const n = LOOKING_MONTHS.length
  return (
    <div aria-hidden className="mt-auto pt-8">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {LOOKING_MONTHS.map((m, i) => {
          const inWindow = i >= from && i <= to
          const isArrival = i === arrive
          return (
            <div key={`${m}-${i}`} className="text-center">
              <div
                className={`h-9 rounded-lg flex items-center justify-center text-[10px] font-semibold ${
                  isArrival
                    ? 'bg-navy-deep text-white'
                    : inWindow
                      ? 'bg-maize-bright text-navy-deep'
                      : 'bg-navy-soft text-ink-muted/60'
                }`}
              >
                {isArrival ? <Plane className="w-4 h-4" strokeWidth={2} /> : null}
              </div>
              <span className="mt-1.5 block text-[10px] text-ink-muted tabular-nums">{m}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-maize-bright" />Start looking</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-navy-deep" />Arrive</span>
      </div>
    </div>
  )
}

export default async function ExchangePage() {
  const live = await furnishedNow()

  return (
    <>
      <style>{`@media print { @page { margin: 10mm } header, footer, nav { display: none !important } body { background: #fff !important } main { padding: 0 !important } a { text-decoration: none !important } .avoid-break { break-inside: avoid } }`}</style>

      <article>
        {/* ── The branded page (screen only) ── */}
        <div className="print:hidden">
          {/* Hero */}
          <section className="relative isolate overflow-hidden -mt-16 pt-16 min-h-[88vh] flex items-center">
            <AtmosphericBackground variant="hero" />
            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-16 items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-5">
                    For exchange offices and students
                  </p>
                  <h1 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-tight text-white">
                    <WordReveal text="Exchange students," delay={0.1} />
                    <br />
                    <WordReveal text="make room for" delay={0.35} />
                    <br />
                    <WordReveal text="your semester." delay={0.65} accentWords={['semester.']} />
                  </h1>
                  <p className="mt-7 text-lg text-white/70 leading-relaxed max-w-xl">
                    Wroomly is a housing marketplace built around the University of Michigan. It helps students find a room or apartment in Ann Arbor for just the months they are here.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link href="/listings" className="group">
                      <MagneticButton showArrow>Browse sublets</MagneticButton>
                    </Link>
                    <a href="#how" className="inline-flex items-center h-12 px-5 rounded-full text-sm text-white/80 hover:text-white transition-colors">
                      How it works
                    </a>
                  </div>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <LiveBadge icon={<Sofa className="w-3.5 h-3.5" strokeWidth={1.75} />} delay={0.9}>
                      Furnished for your term
                    </LiveBadge>
                    <LiveBadge icon={<ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />} delay={1.0}>
                      @umich.edu blue check
                    </LiveBadge>
                  </div>
                </div>
                <div className="animate-float-slow">
                  <LeaseGap />
                </div>
              </div>
            </div>
          </section>

          {/* Why */}
          <section className="py-20 sm:py-28" style={{ background: 'oklch(0.97 0.008 75)' }} aria-label="Why exchange students use Wroomly">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-4">What you get</p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[0.98] max-w-2xl">
                  Built for a few months,{' '}
                  <span className="italic font-light text-gold-deep">not a year.</span>
                </h2>
              </ScrollReveal>
              <div className="mt-14 divide-y divide-line border-y border-line">
                {WHY.map(w => (
                  <ScrollReveal key={w.word} distance={24}>
                    <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-4 md:gap-12 py-9 sm:py-11 items-baseline">
                      <h3 className="font-display text-[clamp(2.1rem,5vw,3.75rem)] leading-none tracking-tight text-ink">{w.word}</h3>
                      <div>
                        <p className="font-medium text-ink">{w.title}</p>
                        <p className="mt-2 text-[15.5px] text-ink-soft leading-relaxed max-w-lg">{w.body}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Live listings */}
          {live.length >= 3 && (
            <section className="py-20 sm:py-24 bg-background" aria-label="Furnished places on Wroomly right now" data-testid="exchange-live">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold-deep font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                        <span className="rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      On Wroomly right now
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-ink mt-3">Furnished places near campus</h2>
                  </div>
                  <Link href="/listings" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline underline-offset-4 shrink-0">
                    See all <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </Link>
                </div>
                <ul className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {live.map(l => {
                    const first = [...(l.listing_images ?? [])].sort((a, b) => a.display_order - b.display_order)[0]
                    const walk = walkToCampus(l.lat, l.lng)
                    return (
                      <li key={l.id}>
                        <Link href={`/listings/${l.id}`} className="group block">
                          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-navy-soft">
                            {first ? (
                              <Image
                                src={getListingImageUrl(first.storage_path)}
                                alt={l.title}
                                fill
                                sizes="(min-width: 1024px) 280px, 45vw"
                                className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                              />
                            ) : (
                              <BedDouble className="absolute inset-0 m-auto w-8 h-8 text-ink-muted/30" />
                            )}
                            <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-maize-bright text-navy-deep px-2.5 py-1 text-[11px] font-bold">
                              <Sofa className="w-3 h-3" strokeWidth={2.25} /> Furnished
                            </span>
                          </div>
                          <p className="mt-3 text-[15px] font-medium text-ink leading-snug line-clamp-2">{l.title}</p>
                          {walk && (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
                              <Footprints className="w-3.5 h-3.5" strokeWidth={1.75} /> {walk.label}
                            </p>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* Timing */}
          <section className="py-20 sm:py-28" style={{ background: 'oklch(0.97 0.008 75)' }} aria-label="When to start looking">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-4">Timing</p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[0.98] max-w-2xl">
                  When to{' '}
                  <span className="italic font-light text-gold-deep">start looking.</span>
                </h2>
              </ScrollReveal>
              <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {TIMING.map((t, i) => (
                  <ScrollReveal key={t.arrive} delay={i * 0.08} distance={24}>
                    <div className="rounded-[2rem] bg-surface border border-line p-7 sm:p-8 h-full flex flex-col">
                      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted font-semibold">
                        <CalendarRange className="w-4 h-4" strokeWidth={1.75} aria-hidden /> {t.arrive}
                      </p>
                      <p className="font-display text-3xl tracking-tight text-ink mt-3">{t.start}</p>
                      <p className="text-[15px] text-ink-soft mt-2 leading-relaxed">{t.why}</p>
                      {i === 0 ? <TimingStrip from={0} to={2} arrive={5} /> : <TimingStrip from={6} to={8} arrive={10} />}
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how" className="py-20 sm:py-28 bg-background scroll-mt-20" aria-label="How it works">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-4">How it works</p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[0.98] max-w-2xl">
                  Four steps to{' '}
                  <span className="italic font-light text-gold-deep">a key in hand.</span>
                </h2>
              </ScrollReveal>
              <ol className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-10 relative">
                <div aria-hidden className="hidden md:block absolute top-5 left-5 right-5 h-px bg-line" />
                {STEPS.map(([title, body], i) => (
                  <li key={title} className="relative">
                    <span className="relative z-10 flex w-10 h-10 items-center justify-center rounded-full bg-navy-deep text-maize-bright font-display text-base tabular-nums ring-8 ring-background" aria-hidden>
                      {i + 1}
                    </span>
                    <h3 className="font-display text-xl tracking-tight text-ink mt-5">{title}</h3>
                    <p className="text-[15px] text-ink-soft leading-relaxed mt-2">{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* For offices */}
          <section className="relative isolate overflow-hidden py-20 sm:py-28">
            <AtmosphericBackground variant="panel" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-5">For exchange and international offices</p>
                <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-white leading-[0.98]">
                  Share this page with{' '}
                  <span className="italic font-light text-maize-bright">your students.</span>
                </h2>
                <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-xl">
                  You are welcome to share or print this page for the students you nominate to Michigan. Questions are welcome at{' '}
                  <a href="mailto:support@wroomly.app" className="text-maize-bright underline underline-offset-4">support@wroomly.app</a>.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link href="/listings"><MagneticButton showArrow>Browse sublets</MagneticButton></Link>
                  <PrintButton tone="dark" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50 font-medium mb-4">Read more</p>
                <ul className="divide-y divide-white/10 border-y border-white/10">
                  {GUIDES.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="group flex items-center justify-between gap-4 py-4 text-[15px] text-white/85 hover:text-white transition-colors">
                        <span>{label}</span>
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-maize-bright group-hover:translate-x-1 transition-all shrink-0" strokeWidth={1.75} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* ── The printed sheet: one plain A4 page ── */}
        <div className="hidden print:block" style={{ zoom: 0.98 }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-muted font-semibold">For exchange offices and students</p>
          <h1 className="font-display text-[2.4rem] leading-[1.02] tracking-tight text-ink mt-2">
            Housing in Ann Arbor for <span className="italic font-light text-gold-deep">exchange students</span> at Michigan
          </h1>
          <p className="mt-2 text-base text-ink-soft leading-relaxed">
            Wroomly is a housing marketplace built around the University of Michigan. It helps students find a room or apartment in Ann Arbor for just the months they are here.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {WHY.map(w => (
              <div key={w.word} className="avoid-break rounded-2xl border border-line p-3">
                <h2 className="font-display text-base tracking-tight text-ink">{w.title}</h2>
                <p className="text-[12.5px] text-ink-soft leading-snug mt-1">{w.body}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl tracking-tight text-ink mt-4">When to start looking</h2>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {TIMING.map(t => (
              <div key={t.arrive} className="avoid-break rounded-2xl border border-line p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-muted font-semibold">{t.arrive}</p>
                <p className="font-display text-base text-ink mt-0.5">{t.start}</p>
                <p className="text-[12.5px] text-ink-soft leading-snug mt-0.5">{t.why}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl tracking-tight text-ink mt-4">How it works</h2>
          <ol className="mt-1.5 space-y-1.5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="avoid-break flex gap-3 rounded-xl border border-line px-3 py-2">
                <span className="font-display text-lg text-gold-deep tabular-nums w-5 shrink-0">{i + 1}</span>
                <div>
                  <h3 className="text-[13.5px] font-medium text-ink">{title}</h3>
                  <p className="text-[12.5px] text-ink-soft leading-snug">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="avoid-break mt-4 rounded-2xl border border-line p-3">
            <h2 className="font-display text-base tracking-tight text-ink">For exchange and international offices</h2>
            <p className="text-[12.5px] text-ink-soft leading-snug mt-1">
              You are welcome to share or print this page for the students you nominate to Michigan. Questions are welcome at support@wroomly.app.
            </p>
          </div>
        </div>

        <p className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:px-0 print:py-0 print:mt-3 text-[13px] text-ink-muted leading-relaxed">
          wroomly.app/exchange · Wroomly is an independent company and is not affiliated with the University of Michigan. Listings, prices and availability are set by the people who post them and change often.
        </p>
      </article>
    </>
  )
}
