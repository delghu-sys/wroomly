import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BUILDINGS, getBuilding, buildingIntro } from '@/lib/seo/buildings'
import { fetchActiveListings } from '@/lib/seo/fetch-listings'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd } from '@/components/seo/JsonLd'
import { Building2, ArrowRight } from 'lucide-react'

export function generateStaticParams() {
  return BUILDINGS.map(b => ({ building: b.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ building: string }>
}): Promise<Metadata> {
  const { building } = await params
  const b = getBuilding(building)
  if (!b) return { title: 'Building not found' }

  const title = `Sublets at ${b.name} — University of Michigan Housing, Ann Arbor`
  const description = `Looking to sublet at ${b.name} in Ann Arbor? Find verified University of Michigan student sublets at ${b.name} on Wroomly — @umich.edu-verified, escrow payments.`
  return {
    title,
    description,
    alternates: { canonical: `/buildings/${b.slug}` },
    openGraph: { title: `${title} | Wroomly`, description, images: ['/og-default.png'] },
  }
}

export default async function BuildingPage({
  params,
}: {
  params: Promise<{ building: string }>
}) {
  const { building } = await params
  const b = getBuilding(building)
  if (!b) notFound()

  const listings = await fetchActiveListings({ residenceName: b.name })
  const intro = buildingIntro(b.name)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Buildings', path: '/listings' },
          { name: b.name, path: `/buildings/${b.slug}` },
        ])}
      />

      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'Browse', path: '/listings' },
          { name: b.name },
        ]}
      />

      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <Building2 className="w-3.5 h-3.5" /> Ann Arbor · Building
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          Sublets at{' '}
          <span className="italic font-light text-navy">{b.name}.</span>
        </h1>
      </header>

      <div className="mt-6 max-w-3xl space-y-4">
        {intro.map((p, i) => (
          <p key={i} className="text-[15px] text-ink-soft leading-relaxed">
            {p}
          </p>
        ))}
        {b.note && (
          <p className="text-[15px] text-ink-soft leading-relaxed">{b.note}</p>
        )}
      </div>

      {/* SEO: explicit non-affiliation disclaimer — we list user-submitted
          sublets at this building, we are not the building or its manager. */}
      <p className="mt-6 max-w-3xl text-[12px] text-ink-muted leading-relaxed rounded-2xl border border-line bg-surface px-4 py-3">
        Wroomly is an independent student marketplace. We are not affiliated
        with, endorsed by, or managed by {b.name} or the University of Michigan.
        Listings are posted by individual verified students.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-tight text-ink mb-6">
          {listings.length > 0
            ? `Live sublets at ${b.name}`
            : `No live sublets at ${b.name} right now`}
        </h2>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => (
              <BrandListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center">
            <p className="text-ink-soft">
              No live listings at {b.name} yet. Save a search and we&rsquo;ll
              email you when one posts.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 mt-4 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition"
            >
              Browse all listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      <section className="mt-14 pt-8 border-t border-line">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">
          Other buildings near campus
        </p>
        <div className="flex flex-wrap gap-2">
          {BUILDINGS.filter(o => o.slug !== b.slug).map(o => (
            <Link
              key={o.slug}
              href={`/buildings/${o.slug}`}
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
