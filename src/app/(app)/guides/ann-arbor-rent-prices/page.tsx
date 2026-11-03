import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchRentSample } from '@/lib/seo/fetch-listings'
import { computeAvailability } from '@/lib/seo/rent-stats'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd, articleJsonLd, rentDatasetJsonLd } from '@/components/seo/JsonLd'
import { ArrowRight } from 'lucide-react'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'

/**
 * Live-data guide: what sublets actually cost in Ann Arbor right now,
 * computed from active Wroomly listings at request time. Unlike the static
 * guides, every number on this page is real — median of live asking rents —
 * with the sample size shown next to it. Buckets under MIN_SAMPLE listings
 * are hidden rather than rendered from a meaninglessly small sample.
 */

const MIN_SAMPLE = 3

export const metadata: Metadata = {
  title: 'Ann Arbor Rent Prices for Students: Live Sublet Data',
  description:
    'What University of Michigan sublets actually cost right now: live median asking rents by bedroom count and neighborhood, computed from active student listings on Wroomly.',
  alternates: { canonical: '/guides/ann-arbor-rent-prices' },
  openGraph: {
    title: 'Ann Arbor Rent Prices for Students: Live Sublet Data | Wroomly',
    description:
      'Live median sublet rents near UMich, by bedroom count and neighborhood.',
    images: ['/og-default.png'],
  },
}

function median(cents: number[]): number {
  const s = [...cents].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

const BEDROOM_LABELS: [label: string, match: (n: number) => boolean][] = [
  ['Studio', n => n === 0],
  ['1 bedroom', n => n === 1],
  ['2 bedrooms', n => n === 2],
  ['3 bedrooms', n => n === 3],
  ['4+ bedrooms', n => n >= 4],
]

export default async function RentPricesPage() {
  const sample = await fetchRentSample()
  const availability = computeAvailability(sample)
  const priced = sample.filter(r => r.price_per_month != null && r.price_per_month > 0)
  const allPrices = priced.map(r => r.price_per_month!)

  const overall = allPrices.length >= MIN_SAMPLE ? median(allPrices) : null

  const byBedrooms = BEDROOM_LABELS.map(([label, match]) => {
    const bucket = priced.filter(r => r.bedrooms != null && match(r.bedrooms))
    return { label, count: bucket.length, median: bucket.length >= MIN_SAMPLE ? median(bucket.map(r => r.price_per_month!)) : null }
  }).filter(b => b.median != null)

  const byNeighborhood = NEIGHBORHOOD_CONTENT.map(n => {
    const bucket = priced.filter(r => r.neighborhood === n.name)
    return { name: n.name, slug: n.slug, count: bucket.length, median: bucket.length >= MIN_SAMPLE ? median(bucket.map(r => r.price_per_month!)) : null }
  })
    .filter(b => b.median != null)
    .sort((a, b) => b.median! - a.median!)

  const furnished = priced.filter(r => r.furnished)
  const unfurnished = priced.filter(r => !r.furnished)
  const furnishedMedian = furnished.length >= MIN_SAMPLE ? median(furnished.map(r => r.price_per_month!)) : null
  const unfurnishedMedian = unfurnished.length >= MIN_SAMPLE ? median(unfurnished.map(r => r.price_per_month!)) : null

  const today = new Date().toISOString().slice(0, 10)

  const faqs = [
    ...(overall
      ? [
          {
            question: 'How much does a sublet cost in Ann Arbor right now?',
            answer: `The median asking rent across the ${priced.length} active student sublets on Wroomly today is ${usd(overall)} per month. Prices vary widely by bedroom count, furniture, and distance to the University of Michigan Central Campus. Furnished rooms near campus command the most.`,
          },
        ]
      : []),
    {
      question: 'Why are summer sublet prices lower than academic-year rent?',
      answer:
        'Most Ann Arbor student leases run 12 months, but many students leave from May to August, so summer supply outstrips demand. People subletting mainly want to stop paying for an empty room, which pushes summer asking rents below the academic-year rate for the same unit.',
    },
    {
      question: 'Where does this rent data come from?',
      answer:
        'Every number on this page is a median of live asking rents on active sublet listings on Wroomly, recomputed on each visit. Listings come from students in the Ann Arbor market; those who sign in with a UMich account carry a verified blue check. Categories with fewer than three listings are hidden rather than shown from a tiny sample.',
    },
  ]

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: 'Ann Arbor rent prices', path: '/guides/ann-arbor-rent-prices' },
          ]),
          articleJsonLd({
            slug: 'ann-arbor-rent-prices',
            headline: 'Ann Arbor rent prices for students: live sublet data',
            description:
              'Live median asking rents for University of Michigan sublets, by bedroom count and neighborhood.',
            datePublished: today,
          }),
          faqJsonLd(faqs),
          rentDatasetJsonLd({
            listingCount: priced.length,
            medianCents: overall,
            computedISO: new Date().toISOString(),
          }),
        ]}
      />

      <header className="relative isolate overflow-hidden -mt-16 pt-16">
        <AtmosphericBackground variant="hero" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-16 sm:pb-20">
          <Breadcrumbs
            tone="dark"
            crumbs={[
              { name: 'Home', path: '/' },
              { name: 'Guides', path: '/guides' },
              { name: 'Ann Arbor rent prices' },
            ]}
          />
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
              <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live data
          </p>
          <h1 className="font-display text-[clamp(2.15rem,5vw,4rem)] leading-[1.0] tracking-tight text-white max-w-4xl text-balance">
            What Ann Arbor sublets{' '}
            <span className="italic font-light text-maize-bright">actually cost.</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-2xl">
            Median asking rents computed live from the active student sublets on
            Wroomly. Not estimates, not last year&rsquo;s survey.
          </p>
          <p className="mt-6 text-[13px] text-white/55">
            Computed {today} from {priced.length} active listing
            {priced.length === 1 ? '' : 's'}. Refreshes on every visit.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {overall ? (
        <>
          <section className="mt-10">
            <div className="rounded-[2rem] bg-maize-bright p-6 sm:p-8 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-navy-deep/70 font-bold">
                Median asking rent, all active sublets
              </p>
              <p className="mt-2 font-display text-5xl tracking-tight text-navy-deep">
                {usd(overall)}
                <span className="text-lg text-navy-deep/70 font-sans"> /month</span>
              </p>
            </div>
          </section>

          {byBedrooms.length > 0 && (
            <section className="mt-12 max-w-3xl">
              <h2 className="font-display text-2xl tracking-tight text-ink mb-4">
                Median rent by bedroom count
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="bg-surface text-left text-ink-muted">
                      <th className="px-4 py-3 font-semibold">Size</th>
                      <th className="px-4 py-3 font-semibold">Median asking rent</th>
                      <th className="px-4 py-3 font-semibold">Active listings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byBedrooms.map(b => (
                      <tr key={b.label} className="border-t border-line">
                        <td className="px-4 py-3 text-ink font-medium">{b.label}</td>
                        <td className="px-4 py-3 text-ink">{usd(b.median!)}/mo</td>
                        <td className="px-4 py-3 text-ink-muted">{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {byNeighborhood.length > 0 && (
            <section className="mt-12 max-w-3xl">
              <h2 className="font-display text-2xl tracking-tight text-ink mb-4">
                Median rent by neighborhood
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="bg-surface text-left text-ink-muted">
                      <th className="px-4 py-3 font-semibold">Neighborhood</th>
                      <th className="px-4 py-3 font-semibold">Median asking rent</th>
                      <th className="px-4 py-3 font-semibold">Active listings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byNeighborhood.map(n => (
                      <tr key={n.slug} className="border-t border-line">
                        <td className="px-4 py-3">
                          <Link
                            href={`/ann-arbor/${n.slug}`}
                            className="text-ink font-medium underline underline-offset-2 decoration-line hover:decoration-ink transition"
                          >
                            {n.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink">{usd(n.median!)}/mo</td>
                        <td className="px-4 py-3 text-ink-muted">{n.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {furnishedMedian != null && unfurnishedMedian != null && (
            <section className="mt-12 max-w-3xl">
              <h2 className="font-display text-2xl tracking-tight text-ink mb-4">
                Furnished vs. unfurnished
              </h2>
              <p className="text-[15px] text-ink-soft leading-relaxed">
                Right now, the median furnished sublet asks {usd(furnishedMedian)}/month
                ({furnished.length} listings) versus {usd(unfurnishedMedian)}/month
                unfurnished ({unfurnished.length} listings). Furniture is one of
                the two biggest pricing levers in the student market. The other
                is walking distance to Central Campus.
              </p>
            </section>
          )}

          {/* When listings become available. This is the one statistic here
              that isn't about price, and it's the most distinctive: nobody
              else publishes the Ann Arbor student-housing calendar from live
              inventory. Rows with an impossible date range are excluded by
              computeAvailability, so validCount can trail the price sample. */}
          {availability.byMonth.length > 0 && (
            <section className="mt-12 max-w-3xl">
              <h2 className="font-display text-2xl tracking-tight text-ink mb-4">
                When listings become available
              </h2>
              <p className="text-[15px] text-ink-soft leading-relaxed">
                {availability.julyAugustSharePct}% of the{' '}
                {availability.validCount} active listings with usable dates
                become available in July or August
                {availability.medianTermMonths != null && (
                  <>
                    , and the median advertised term is{' '}
                    {availability.medianTermMonths} months
                  </>
                )}
                . Ann Arbor&rsquo;s student market turns over on the academic
                calendar, not month to month, which is why searching in
                February for a February move-in finds so little.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-[14.5px] border-collapse">
                  <thead>
                    <tr className="bg-navy-soft/40">
                      <th scope="col" className="px-4 py-2.5 font-semibold text-ink">
                        Move-in month
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-ink">
                        Listings
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-ink">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.byMonth.map(m => (
                      <tr key={m.month} className="border-t border-line">
                        <td className="px-4 py-3 font-medium text-ink">{m.month}</td>
                        <td className="px-4 py-3 text-ink-soft">{m.count}</td>
                        <td className="px-4 py-3 text-ink-soft">{m.sharePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="mt-10 max-w-3xl">
          <p className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-6 text-[15px] text-ink-soft leading-relaxed">
            Not enough active listings right now to compute reliable medians.
            We only publish numbers backed by at least {MIN_SAMPLE} live
            listings. Check the{' '}
            <Link href="/listings" className="underline underline-offset-2">
              live listings
            </Link>{' '}
            directly, or come back soon.
          </p>
        </section>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight text-ink mb-4">
          How to read these numbers
        </h2>
        <div className="space-y-4 text-[15px] text-ink-soft leading-relaxed">
          <p>
            These are <strong>asking rents on sublets</strong>, not lease rates,
            and that distinction matters. Sublet prices, especially in summer,
            typically sit below what the same unit costs on a 12-month lease,
            because the person subletting mostly wants to stop paying for an
            empty room. Use these medians to sanity-check a deal, not as the
            market rate for signing a new lease.
          </p>
          <p>
            Medians beat averages here: one luxury penthouse or one $400
            room-in-a-house would drag an average around, while the median tells
            you what the middle listing actually asks. Buckets with fewer than{' '}
            {MIN_SAMPLE} active listings are hidden entirely rather than
            rendered from a meaninglessly small sample.
          </p>
          <p>
            Pricing your own place?{' '}
            <Link href="/guides/how-to-price-your-sublet" className="underline underline-offset-2 hover:text-ink transition">
              How to price your sublet
            </Link>{' '}
            walks through using these numbers, and{' '}
            <Link href="/guides/how-to-sublet-your-apartment-at-university-of-michigan" className="underline underline-offset-2 hover:text-ink transition">
              the subletting guide
            </Link>{' '}
            covers the rest of the process.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight text-ink mb-5">FAQs</h2>
        <div className="space-y-5">
          {faqs.map((f, i) => (
            <div key={i}>
              <h3 className="text-[15px] font-semibold text-ink mb-1.5">{f.question}</h3>
              <p className="text-[14px] text-ink-soft leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 pt-8 border-t border-line">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-navy-deep text-maize-bright text-sm font-semibold hover:bg-navy-deep/90 transition"
        >
          Browse live sublets <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
      </div>
    </div>
  )
}
