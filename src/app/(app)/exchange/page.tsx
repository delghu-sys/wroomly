import Link from 'next/link'
import type { Metadata } from 'next'
import { CalendarRange, Armchair, ShieldCheck, ArrowRight } from 'lucide-react'
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
 * The one-page overview that exchange offices can forward or print — and the
 * link our outreach emails point to. Every claim here is one the site already
 * makes elsewhere (About, the international-student guide, Trust & Safety);
 * nothing about prices, listing counts or partnerships, which this page
 * cannot keep current.
 */

const WHY = [
  {
    icon: CalendarRange,
    title: 'A place for just your semester',
    body: 'Most Ann Arbor leases run twelve months. On Wroomly, current Michigan students sublet their room or apartment while they are away, so the dates can match an exchange term instead of a full lease.',
  },
  {
    icon: Armchair,
    title: 'Furnished, so you can land and unpack',
    body: 'Arriving with two suitcases, a furnished place saves you from buying furniture for a few months. Filter listings by dates and by furnished.',
  },
  {
    icon: ShieldCheck,
    title: 'Know who you are renting from',
    body: 'Michigan students who sign in with their @umich.edu Google account carry a blue check. Listings are reviewed, and conversations stay on Wroomly.',
  },
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

export default function ExchangePage() {
  return (
    <>
      {/* A printed copy is the page itself: no site header, footer or buttons. */}
      <style>{`@media print { @page { margin: 9mm } article { zoom: 0.68 } header, footer, nav { display: none !important } body { background: #fff !important } main { padding: 0 !important } a { text-decoration: none !important } .avoid-break { break-inside: avoid } }`}</style>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 print:py-0 print:max-w-none">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold">For exchange offices and students</p>
          <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-tight text-ink mt-4 max-w-3xl text-balance">
            Housing in Ann Arbor for <span className="italic font-light text-gold-deep">exchange students</span> at Michigan
          </h1>
          <p className="mt-5 print:mt-2 text-lg text-ink-soft leading-relaxed max-w-2xl">
            Wroomly is a housing marketplace built around the University of Michigan. It helps students find a room or apartment in Ann Arbor for just the months they are here.
          </p>
        </div>

        <section className="mt-12 print:mt-4 grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-2" aria-label="Why exchange students use Wroomly">
          {WHY.map(({ icon: Icon, title, body }) => (
            <div key={title} className="avoid-break rounded-3xl border border-line bg-surface p-6 shadow-1">
              <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center mb-4 print:border print:border-line">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-lg tracking-tight text-ink">{title}</h2>
              <p className="text-[14.5px] text-ink-soft leading-relaxed mt-2">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 print:mt-4 avoid-break">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">When to start looking</h2>
          <div className="mt-5 print:mt-2 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 print:gap-2">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-semibold">Arriving in the fall</p>
              <p className="font-display text-xl text-ink mt-1.5">Start in the spring</p>
              <p className="text-[14.5px] text-ink-soft mt-1.5 leading-relaxed">Housing is tightest for the fall term, so look early.</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-semibold">Arriving in January</p>
              <p className="font-display text-xl text-ink mt-1.5">Start in November</p>
              <p className="text-[14.5px] text-ink-soft mt-1.5 leading-relaxed">Sublets move on your schedule: two to four months before arrival is a good window.</p>
            </div>
          </div>
        </section>

        <section className="mt-14 print:mt-4 avoid-break">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">How it works</h2>
          <ol className="mt-5 print:mt-2 space-y-3 print:space-y-1.5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 print:p-2.5">
                <span className="font-display text-2xl text-gold-deep tabular-nums w-7 shrink-0" aria-hidden>{i + 1}</span>
                <div>
                  <h3 className="font-medium text-ink">{title}</h3>
                  <p className="text-[14.5px] text-ink-soft leading-relaxed mt-1">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 avoid-break print:hidden">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">Read more</h2>
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            {GUIDES.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px] text-navy hover:bg-navy-soft/30 transition-colors">
                  <span>{label}</span>
                  <ArrowRight className="w-4 h-4 text-ink-muted shrink-0 print:hidden" strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 print:mt-4 avoid-break rounded-3xl bg-navy-deep text-white p-7 sm:p-9 print:bg-white print:text-ink print:border print:border-line print:p-3 print:rounded-2xl">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">For exchange and international offices</h2>
          <p className="mt-3 print:mt-1 text-white/75 print:text-ink-soft leading-relaxed max-w-2xl">
            You are welcome to share or print this page for the students you nominate to Michigan. Questions are welcome at{' '}
            <a href="mailto:help@wroomly.app" className="text-maize-bright print:text-navy underline underline-offset-2">help@wroomly.app</a>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <Link href="/listings" className="inline-flex items-center gap-2 rounded-full bg-maize-bright text-navy-deep px-6 h-11 text-sm font-semibold hover:opacity-90 transition-opacity">
              Browse sublets <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <PrintButton />
          </div>
        </section>

        <p className="mt-8 print:mt-3 text-[13px] text-ink-muted leading-relaxed">
          wroomly.app/exchange · Wroomly is an independent company and is not affiliated with the University of Michigan. Listings, prices and availability are set by the people who post them and change often.
        </p>
      </article>
    </>
  )
}
