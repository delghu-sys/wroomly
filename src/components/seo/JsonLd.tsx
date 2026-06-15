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
      // eslint-disable-next-line react/no-danger
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
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.datePublished,
    mainEntityOfPage: `${ORIGIN}/guides/${opts.slug}`,
    author: { '@type': 'Organization', name: 'Wroomly', url: ORIGIN },
    publisher: { '@id': `${ORIGIN}/#organization` },
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
  type: string
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

  // Only sublets have a monetary offer; swaps don't.
  if (opts.type === 'sublet' && opts.pricePerMonthCents) {
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
      logo: `${ORIGIN}/og-default.png`,
      description:
        'Verified student housing marketplace for subletting and swapping near the University of Michigan in Ann Arbor.',
      areaServed: {
        '@type': 'City',
        name: 'Ann Arbor',
        containedInPlace: { '@type': 'State', name: 'Michigan' },
      },
      email: 'help@wroomly.app',
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
