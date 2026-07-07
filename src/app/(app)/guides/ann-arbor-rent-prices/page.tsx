import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchRentSample } from '@/lib/seo/fetch-listings'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd, articleJsonLd } from '@/components/seo/JsonLd'
import { BookOpen, ArrowRight } from 'lucide-react'

/**
 * Live-data guide: what sublets actually cost in Ann Arbor right now,
 * computed from active Wroomly listings at request time. Unlike the static
 * guides, every number on this page is real — median of live asking rents —
 * with the sample size shown next to it. Buckets under MIN_SAMPLE listings
 * are hidden rather than rendered from a meaninglessly small sample.
 */

const MIN_SAMPLE = 3

export const metadata: Metadata = {
  title: 'Ann Arbor Rent Prices for Students — Live Sublet Data',
  description:
    'What University of Michigan sublets actually cost right now: live median asking rents by bedroom count and neighborhood, computed from active verified student listings on Wroomly.',
  alternates: { canonical: '/guides/ann-arbor-rent-prices' },
  openGraph: {
    title: 'Ann Arbor Rent Prices for Students — Live Sublet Data | Wroomly',
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
            answer: `The median asking rent across the ${priced.length} active verified student sublets on Wroomly today is ${usd(overall)} per month. Prices vary widely by bedroom count, furniture, and distance to the University of Michigan Central Campus — furnished rooms near campus command the most.`,
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
        'Every number on this page is a median of live asking rents on active sublet listings posted by @umich.edu-verified University of Michigan students on Wroomly, recomputed on each visit. Categories with fewer than three listings are hidden rather than shown from a tiny sample.',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: 'Ann Arbor rent prices', path: '/guides/ann-arbor-rent-prices' },
          ]),
          articleJsonLd({
            slug: 'ann-arbor-rent-prices',
            headline: 'Ann Arbor rent prices for students — live sublet data',
            description:
              'Live median asking rents for University of Michigan sublets, by bedroom count and neighborhood.',
            datePublished: today,
          }),
          faqJsonLd(faqs),
        ]}
      />

      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: 'Ann Arbor rent prices' },
        ]}
      />

      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <BookOpen className="w-3.5 h-3.5" /> Live data
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          What Ann Arbor sublets{' '}
          <span className="italic font-light text-navy">actually cost.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          Median asking rents computed live from the active, verified student
          sublets on Wroomly — not estimates, not last year&rsquo;s survey.
        </p>
        <p className="mt-2 text-[12px] text-ink-muted">
          Computed {today} from {priced.length} active listing
          {priced.length === 1 ? '' : 's'}. Refreshes on every visit.
        </p>
      </header>

      {overall ? (
        <>
          <section className="mt-10">
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold">
                Median asking rent, all active sublets
              </p>
              <p className="mt-2 font-display text-5xl tracking-tight text-ink">
                {usd(overall)}
                <span className="text-lg text-ink-muted font-sans"> /month</span>
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
                the two biggest pricing levers in the student market — the other
                is walking distance to Central Campus.
              </p>
            </section>
          )}
        </>
      ) : (
        <section className="mt-10 max-w-3xl">
          <p className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-6 text-[15px] text-ink-soft leading-relaxed">
            Not enough active listings right now to compute reliable medians —
            we only publish numbers backed by at least {MIN_SAMPLE} live
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
            These are <strong>asking rents on sublets</strong>, not lease rates
            — and that distinction matters. Sublet prices, especially in summer,
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
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition"
        >
          Browse live sublets <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}
