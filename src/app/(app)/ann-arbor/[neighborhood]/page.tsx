import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NEIGHBORHOOD_CONTENT, getNeighborhood } from '@/lib/seo/neighborhoods'
import { fetchActiveListings } from '@/lib/seo/fetch-listings'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd } from '@/components/seo/JsonLd'
import { MapPin, ArrowRight, Check } from 'lucide-react'

// Pre-render all neighborhood pages at build time.
export function generateStaticParams() {
  return NEIGHBORHOOD_CONTENT.map(n => ({ neighborhood: n.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ neighborhood: string }>
}): Promise<Metadata> {
  const { neighborhood } = await params
  const n = getNeighborhood(neighborhood)
  if (!n) return { title: 'Neighborhood not found' }

  const title = `${n.name} Sublets — University of Michigan Housing in Ann Arbor`
  const description = `${n.tagline} Find verified UMich student sublets in ${n.name}, Ann Arbor on Wroomly. ${n.intro[0].slice(0, 90)}…`
  return {
    title,
    description,
    alternates: { canonical: `/ann-arbor/${n.slug}` },
    openGraph: { title: `${title} | Wroomly`, description, images: ['/og-default.png'] },
  }
}

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ neighborhood: string }>
}) {
  const { neighborhood } = await params
  const n = getNeighborhood(neighborhood)
  if (!n) notFound()

  const listings = await fetchActiveListings({ neighborhood: n.name })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Ann Arbor neighborhoods', path: '/listings' },
          { name: n.name, path: `/ann-arbor/${n.slug}` },
        ])}
      />

      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'Browse', path: '/listings' },
          { name: n.name },
        ]}
      />

      {/* Hero */}
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <MapPin className="w-3.5 h-3.5" /> Ann Arbor · Neighborhood
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          {n.name} sublets near the{' '}
          <span className="italic font-light text-navy">University of Michigan.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">{n.tagline}</p>
      </header>

      {/* Area description */}
      <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <div className="space-y-4">
          {n.intro.map((p, i) => (
            <p key={i} className="text-[15px] text-ink-soft leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <aside className="rounded-3xl border border-line bg-surface p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-3">
            Quick take
          </p>
          <ul className="space-y-2.5">
            {n.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-ink-soft">
                <Check className="w-4 h-4 text-[oklch(0.45_0.13_85)] shrink-0 mt-0.5" strokeWidth={2.5} />
                {h}
              </li>
            ))}
          </ul>
          <p className="mt-4 pt-4 border-t border-line text-[13px] text-ink-muted leading-relaxed">
            Best for {n.bestFor}.
          </p>
        </aside>
      </div>

      {/* Live listings */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl tracking-tight text-ink">
            {listings.length > 0
              ? `Live sublets in ${n.name}`
              : `No live sublets in ${n.name} right now`}
          </h2>
          <Link
            href="/listings"
            className="text-sm text-navy hover:text-ink flex items-center gap-1 shrink-0"
          >
            All Ann Arbor listings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => (
              <BrandListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center">
            <p className="text-ink-soft">
              Nothing in {n.name} at the moment — but listings post all the time.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 mt-4 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition"
            >
              Browse all neighborhoods <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Internal links to other neighborhoods */}
      <section className="mt-14 pt-8 border-t border-line">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">
          Other Ann Arbor neighborhoods
        </p>
        <div className="flex flex-wrap gap-2">
          {NEIGHBORHOOD_CONTENT.filter(o => o.slug !== n.slug).map(o => (
            <Link
              key={o.slug}
              href={`/ann-arbor/${o.slug}`}
              className="inline-flex items-center px-3.5 h-9 rounded-full text-[13px] font-medium bg-white/85 border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.45)] hover:text-ink transition"
            >
              {o.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
