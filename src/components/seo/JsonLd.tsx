/**
 * Server-rendered JSON-LD injector.
 *
 * Renders a <script type="application/ld+json"> with the given object.
 * Server component (no 'use client') so the markup is in the initial
 * HTML where crawlers read it — not hydrated client-side.
 *
 * `data` is stringified with a guard against the </script> breakout
 * vector (a stored string containing "</script>" could otherwise close
 * the tag early).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}

const ORIGIN = 'https://wroomly.app'

/** FAQPage — pass [{question, answer}] (answer as plain text). */
export function faqJsonLd(
  faqs: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

/** Article schema for a guide page. */
export function articleJsonLd(opts: {
  slug: string
  headline: string
  description: string
  datePublished: string
  /** Last substantive revision. Defaults to datePublished. Keeping these
      separate matters for AI engines, which weight freshness heavily — a
      guide revised in August should say so, not claim July. */
  dateModified?: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: `${ORIGIN}/guides/${opts.slug}`,
    // Named human author (E-E-A-T): AI engines cite content with a real,
    // identifiable person behind it markedly more than anonymous org bylines.
    // Hugo is the publicly named UMich-student founder — that IS the brand's
    // positioning, so the byline states it.
    author: {
      '@type': 'Person',
      name: 'Hugo Delgado Verdu',
      url: ORIGIN,
      jobTitle: 'Founder, Wroomly',
      affiliation: { '@id': `${ORIGIN}/#organization` },
    },
    publisher: { '@id': `${ORIGIN}/#organization` },
  }
}

/**
 * Dataset schema for the live rent-price data — Wroomly's single most
 * citable asset. Original data computed from active listings is exactly what
 * AI engines prefer to cite over aggregated third-party numbers (the
 * Princeton GEO study puts statistics at +37% citation visibility).
 */
export function rentDatasetJsonLd(opts: {
  listingCount: number
  medianCents: number | null
  computedISO: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Ann Arbor student sublet asking rents',
    description: `Median asking rents for University of Michigan student sublets in Ann Arbor, by bedroom count and neighborhood. Computed live from ${opts.listingCount} active listings on Wroomly; recomputed on every visit.${opts.medianCents ? ` Current overall median: $${Math.round(opts.medianCents / 100).toLocaleString()}/month.` : ''}`,
    url: `${ORIGIN}/guides/ann-arbor-rent-prices`,
    creator: { '@id': `${ORIGIN}/#organization` },
    dateModified: opts.computedISO,
    temporalCoverage: opts.computedISO.slice(0, 10),
    spatialCoverage: {
      '@type': 'City',
      name: 'Ann Arbor',
      containedInPlace: { '@type': 'State', name: 'Michigan' },
    },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Median asking rent', unitText: 'USD per month' },
    ],
    isAccessibleForFree: true,
    license: `${ORIGIN}/terms`,
  }
}

/** BreadcrumbList — pass ordered [{name, url}] crumbs. */
export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${ORIGIN}${c.path}`,
    })),
  }
}

/**
 * Accommodation schema for a single listing. Only real fields are
 * included — anything missing is omitted rather than faked, so the
 * markup never claims data we don't have.
 */
export function listingJsonLd(opts: {
  id: string
  title: string
  description: string | null
  pricePerMonthCents: number | null
  bedrooms: number | null
  bathrooms: number | null
  neighborhood: string | null
  city: string | null
  state: string | null
  availableFrom: string | null
  availableTo: string | null
  furnished: boolean
  petsAllowed: boolean
  imageUrls: string[]
}): Record<string, unknown> {
  const amenities: Record<string, unknown>[] = []
  if (opts.furnished)
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Furnished', value: true })
  if (opts.petsAllowed)
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Pets allowed', value: true })

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    '@id': `${ORIGIN}/listings/${opts.id}`,
    name: opts.title,
    url: `${ORIGIN}/listings/${opts.id}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: opts.city ?? 'Ann Arbor',
      addressRegion: opts.state ?? 'MI',
      addressCountry: 'US',
    },
  }
  if (opts.description) node.description = opts.description.slice(0, 500)
  if (opts.bedrooms != null) node.numberOfBedrooms = opts.bedrooms
  if (opts.bathrooms != null)
    node.numberOfBathroomsTotal = opts.bathrooms
  if (amenities.length) node.amenityFeature = amenities
  if (opts.imageUrls.length) node.image = opts.imageUrls.slice(0, 6)

  if (opts.pricePerMonthCents) {
    node.potentialAction = undefined
    node.offers = {
      '@type': 'Offer',
      price: (opts.pricePerMonthCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      ...(opts.availableFrom ? { availabilityStarts: opts.availableFrom } : {}),
      ...(opts.availableTo ? { availabilityEnds: opts.availableTo } : {}),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: (opts.pricePerMonthCents / 100).toFixed(2),
        priceCurrency: 'USD',
        unitCode: 'MON',
      },
    }
  }

  return node
}

/**
 * Official Wroomly profiles, in `sameAs` order. This is the entity's
 * off-site footprint — Google reconciles these to treat "Wroomly" as a known
 * organization (a prerequisite for a branded knowledge panel / sitelinks).
 * ONLY list profiles that actually exist and are named "Wroomly" with this
 * same URL; a link to a missing/placeholder profile hurts rather than helps.
 * Append here as each profile goes live (X, LinkedIn company page, Crunchbase,
 * Google Business Profile, TikTok…).
 */
const SOCIAL_PROFILES: string[] = [
  'https://instagram.com/wroomly.app',
]

/**
 * Organization + WebSite schema for the root layout. The WebSite node
 * carries a SearchAction so Google can render a sitelinks search box
 * pointing at our /listings?q= search.
 */
export function siteJsonLd(): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${ORIGIN}/#organization`,
      name: 'Wroomly',
      url: ORIGIN,
      // The brand logo (square) — Google reads this for the org logo.
      // (og-default.png exists now, but the org logo should stay the square
      // mark, not the wide 1200x630 share card.)
      logo: {
        '@type': 'ImageObject',
        url: `${ORIGIN}/logo.png`,
      },
      description:
        'Student housing marketplace for subletting near the University of Michigan in Ann Arbor, where verified UMich students carry a blue check.',
      areaServed: {
        '@type': 'City',
        name: 'Ann Arbor',
        containedInPlace: { '@type': 'State', name: 'Michigan' },
      },
      email: 'help@wroomly.app',
      ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {}),
      founder: { '@type': 'Person', name: 'Hugo Delgado Verdu' },
      knowsAbout: [
        'student sublets',
        'Ann Arbor housing',
        'University of Michigan off-campus housing',
        'sublease agreements',
        'rental scam prevention',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      url: ORIGIN,
      name: 'Wroomly',
      publisher: { '@id': `${ORIGIN}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${ORIGIN}/listings?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ]
}
