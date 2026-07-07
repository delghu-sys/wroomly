import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BUILDINGS, getBuilding, buildingIntro, buildingFaqs } from '@/lib/seo/buildings'
import { getNeighborhood } from '@/lib/seo/neighborhoods'
import { fetchActiveListings } from '@/lib/seo/fetch-listings'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/components/seo/JsonLd'
import { Building2, ArrowRight, MapPin, Check } from 'lucide-react'

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
  const description = b.address
    ? `Sublet at ${b.name} (${b.address.split(',')[0]}) in Ann Arbor. Verified University of Michigan student sublets, plus floor plans, amenities, and location facts — every account @umich.edu-verified.`
    : `Looking to sublet at ${b.name} in Ann Arbor? Find verified University of Michigan student sublets at ${b.name} on Wroomly — every account @umich.edu-verified.`
  return {
    title,
    description,
    alternates: { canonical: `/buildings/${b.slug}` },
    openGraph: { title: `${title} | Wroomly`, description, images: ['/og-default.png'] },
  }
}

/** ApartmentComplex schema — only emitted when the address is verified. */
function apartmentComplexJsonLd(b: {
  name: string
  slug: string
  address: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: b.name,
    url: `https://wroomly.app/buildings/${b.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address.split(',')[0],
      addressLocality: 'Ann Arbor',
      addressRegion: 'MI',
      addressCountry: 'US',
    },
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
  const intro = b.intro ?? buildingIntro(b.name)
  const faqs = buildingFaqs(b)
  const hood = b.neighborhoodSlug ? getNeighborhood(b.neighborhoodSlug) : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Buildings', path: '/buildings' },
          { name: b.name, path: `/buildings/${b.slug}` },
        ])}
      />
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
      {b.address && (
        <JsonLd data={apartmentComplexJsonLd({ name: b.name, slug: b.slug, address: b.address })} />
      )}

      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'Buildings', path: '/buildings' },
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
        {b.address && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
            <MapPin className="w-3.5 h-3.5" />
            {b.address}
            {hood && (
              <>
                {' · '}
                <Link
                  href={`/ann-arbor/${hood.slug}`}
                  className="underline underline-offset-2 hover:text-ink transition"
                >
                  {hood.name}
                </Link>
              </>
            )}
          </p>
        )}
        {b.aka && (
          <p className="mt-1.5 text-[12px] text-ink-muted italic">Also known as {b.aka}.</p>
        )}
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

      {b.facts && b.facts.length > 0 && (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-3">
            {b.name} at a glance
          </h2>
          <ul className="rounded-2xl border border-line bg-surface px-5 py-4 space-y-2.5">
            {b.facts.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-soft leading-snug">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-[oklch(0.45_0.13_85)]" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SEO: explicit non-affiliation disclaimer — we list user-submitted
          sublets at this building, we are not the building or its manager. */}
      <p className="mt-6 max-w-3xl text-[12px] text-ink-muted leading-relaxed rounded-2xl border border-line bg-surface px-4 py-3">
        Wroomly is an independent student marketplace. We are not affiliated
        with, endorsed by, or managed by {b.name} or the University of Michigan.
        Listings are posted by individual verified students. Building details
        above are compiled from public sources and may change — always confirm
        with the building directly.
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

      <section className="mt-14 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight text-ink mb-5">
          {b.name} sublet FAQs
        </h2>
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
        <p className="mt-6 text-[13px] text-ink-muted">
          New to subletting?{' '}
          <Link href="/guides" className="underline underline-offset-2 hover:text-ink transition">
            Read the Wroomly guides
          </Link>{' '}
          — how to sublet, pricing, deposits, and avoiding scams.
        </p>
      </section>
    </div>
  )
}
