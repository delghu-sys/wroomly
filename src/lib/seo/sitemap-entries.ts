import type { MetadataRoute } from 'next'

const ORIGIN = 'https://wroomly.app'

export interface ListingStamp {
  id: string
  updated_at?: string | null
  created_at: string
}

export interface SitemapInput {
  listings: ListingStamp[]
  neighborhoods: string[]
  buildings: string[]
  guides: { slug: string; updated: string }[]
}

type Entry = MetadataRoute.Sitemap[number]

/**
 * The sitemap's entries, as a pure function.
 *
 * A `lastModified` is only given where it is true. Setting every page's date
 * to "now" teaches Google to ignore the field. Pages that show live listings
 * take the latest listing change; the guides index takes the newest guide
 * update; guides and listings carry their own dates; pages with no honest
 * date (policies, buildings, neighborhoods' static text) carry none.
 */
export function buildSitemap({ listings, neighborhoods, buildings, guides }: SitemapInput): MetadataRoute.Sitemap {
  const stamps = listings.map(l => new Date(l.updated_at ?? l.created_at).getTime()).filter(Number.isFinite)
  const latestListing = stamps.length ? new Date(Math.max(...stamps)) : undefined
  const newestGuide = guides.length ? new Date(Math.max(...guides.map(g => new Date(g.updated).getTime()))) : undefined

  const page = (path: string, changeFrequency: Entry['changeFrequency'], priority: number, lastModified?: Date): Entry => ({
    url: `${ORIGIN}${path}`,
    changeFrequency,
    priority,
    ...(lastModified ? { lastModified } : {}),
  })

  return [
    page('/', 'weekly', 1, latestListing),
    page('/listings', 'hourly', 0.9, latestListing),
    page('/about', 'monthly', 0.7),
    page('/exchange', 'monthly', 0.6),
    // Public, no account needed: the renter alert signup and the host importer.
    page('/match', 'monthly', 0.6),
    page('/import-listing', 'monthly', 0.5),
    page('/terms', 'yearly', 0.3),
    page('/safety', 'monthly', 0.5),
    page('/privacy', 'yearly', 0.3),
    page('/guides', 'monthly', 0.6, newestGuide),
    page('/buildings', 'weekly', 0.7),
    // Recomputed from live listings on every visit.
    page('/guides/ann-arbor-rent-prices', 'daily', 0.7, latestListing),
    ...neighborhoods.map(slug => page(`/ann-arbor/${slug}`, 'weekly', 0.7, latestListing)),
    ...buildings.map(slug => page(`/buildings/${slug}`, 'weekly', 0.6)),
    ...guides.map(g => page(`/guides/${g.slug}`, 'monthly', 0.5, new Date(g.updated))),
    ...listings.map(l => page(`/listings/${l.id}`, 'weekly', 0.7, new Date(l.updated_at ?? l.created_at))),
  ]
}
