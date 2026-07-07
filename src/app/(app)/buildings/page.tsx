import type { Metadata } from 'next'
import Link from 'next/link'
import { BUILDINGS } from '@/lib/seo/buildings'
import { getNeighborhood } from '@/lib/seo/neighborhoods'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd } from '@/components/seo/JsonLd'
import { Building2, ArrowRight, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Ann Arbor Student Buildings — Sublets by Building | UMich Housing',
  description:
    'Every major student apartment building near the University of Michigan — addresses, floor plans, amenities, and live verified sublets at Verve, Hub on Campus, Landmark, The Standard, and more.',
  alternates: { canonical: '/buildings' },
  openGraph: {
    title: 'Ann Arbor Student Buildings — Sublets by Building | Wroomly',
    description:
      'Addresses, floor plans, amenities, and live verified UMich sublets, building by building.',
    images: ['/og-default.png'],
  },
}

export default function BuildingsIndexPage() {
  // Buildings with researched facts lead; unverified names follow as chips.
  const detailed = BUILDINGS.filter(b => !!b.address)
  const rest = BUILDINGS.filter(b => !b.address)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Buildings', path: '/buildings' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Student apartment buildings near the University of Michigan',
            itemListElement: detailed.map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: b.name,
              url: `https://wroomly.app/buildings/${b.slug}`,
            })),
          },
        ]}
      />

      <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'Buildings' }]} />

      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <Building2 className="w-3.5 h-3.5" /> Ann Arbor · Buildings
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          UMich sublets,{' '}
          <span className="italic font-light text-navy">building by building.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          The major student apartment buildings near the University of Michigan
          — where they are, what they offer, and the live sublets posted at each
          by verified @umich.edu students.
        </p>
      </header>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {detailed.map(b => {
          const hood = b.neighborhoodSlug ? getNeighborhood(b.neighborhoodSlug) : undefined
          return (
            <Link
              key={b.slug}
              href={`/buildings/${b.slug}`}
              className="group rounded-3xl border border-line bg-surface p-6 hover:border-[oklch(0.84_0.17_85/0.45)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <h2 className="font-display text-xl tracking-tight text-ink leading-snug group-hover:text-navy transition-colors">
                {b.name}
              </h2>
              <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12px] text-ink-muted">
                <MapPin className="w-3.5 h-3.5 mt-[1px] shrink-0" />
                {b.address!.split(',')[0]}
                {hood ? ` · ${hood.name}` : ''}
              </p>
              {b.facts && b.facts.length > 1 && (
                <p className="mt-2.5 text-[13px] text-ink-soft leading-relaxed line-clamp-2">
                  {b.facts[1]}
                </p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-navy font-medium group-hover:gap-2 transition-all">
                See sublets <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          )
        })}
      </div>

      {rest.length > 0 && (
        <section className="mt-12">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">
            More buildings
          </p>
          <div className="flex flex-wrap gap-2">
            {rest.map(b => (
              <Link
                key={b.slug}
                href={`/buildings/${b.slug}`}
                className="inline-flex items-center px-3.5 h-9 rounded-full text-[13px] font-medium bg-white/85 border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.45)] hover:text-ink transition"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14 pt-8 border-t border-line max-w-3xl">
        <p className="text-[14px] text-ink-soft leading-relaxed">
          Don&rsquo;t see your building? Sublets in houses, co-ops, and smaller
          buildings live on the main{' '}
          <Link href="/listings" className="underline underline-offset-2 hover:text-ink transition">
            browse page
          </Link>
          , searchable by{' '}
          <Link href="/ann-arbor/central-campus" className="underline underline-offset-2 hover:text-ink transition">
            neighborhood
          </Link>
          . New to subletting? Start with the{' '}
          <Link href="/guides" className="underline underline-offset-2 hover:text-ink transition">
            guides
          </Link>
          .
        </p>
        <p className="mt-4 text-[12px] text-ink-muted leading-relaxed">
          Wroomly is an independent student marketplace, not affiliated with any
          building or the University of Michigan. Building details are compiled
          from public sources and may change — confirm with the building
          directly.
        </p>
      </section>
    </div>
  )
}
