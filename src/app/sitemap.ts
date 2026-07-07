import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'
import { BUILDINGS } from '@/lib/seo/buildings'
import { GUIDES } from '@/lib/seo/guides'

const ORIGIN = 'https://wroomly.app'

/**
 * Dynamic sitemap — static marketing routes + every active listing.
 * User profiles are excluded (private-leaning surface even when public).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${ORIGIN}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${ORIGIN}/listings`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${ORIGIN}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${ORIGIN}/sign-up`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${ORIGIN}/sign-in`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${ORIGIN}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${ORIGIN}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${ORIGIN}/guides`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${ORIGIN}/buildings`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      // Live-data page (own route, not part of GUIDES) — recomputed per
      // visit, so it genuinely changes daily.
      url: `${ORIGIN}/guides/ann-arbor-rent-prices`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]

  // SEO landing pages — neighborhood + building + guide pages. These are
  // statically generated and carry the bulk of the long-tail ranking
  // surface, so they belong in the sitemap with solid priority.
  const neighborhoodRoutes: MetadataRoute.Sitemap = NEIGHBORHOOD_CONTENT.map(n => ({
    url: `${ORIGIN}/ann-arbor/${n.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const buildingRoutes: MetadataRoute.Sitemap = BUILDINGS.map(b => ({
    url: `${ORIGIN}/buildings/${b.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map(g => ({
    url: `${ORIGIN}/guides/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const landingRoutes = [
    ...neighborhoodRoutes,
    ...buildingRoutes,
    ...guideRoutes,
  ]

  // Best-effort listings — if Supabase is unreachable at build/edge time, fall
  // back to the static routes only so the sitemap still serves.
  //
  // SEO: `status = 'active'` is also our test-data exclusion. Placeholder /
  // test listings should be set to status='archived' (reversible, keeps the
  // row) so they drop out of the sitemap, browse grid, and structured data
  // without a schema change. We deliberately don't add an is_test column —
  // it would create a deploy-ordering hazard (code filtering a column the
  // prod DB doesn't have yet) for no gain over status-based exclusion.
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select('id, updated_at, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5000)

    const listingRoutes: MetadataRoute.Sitemap =
      (data ?? []).map(
        (l: { id: string; updated_at?: string | null; created_at: string }) => ({
          url: `${ORIGIN}/listings/${l.id}`,
          lastModified: new Date(l.updated_at ?? l.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })
      )

    return [...staticRoutes, ...landingRoutes, ...listingRoutes]
  } catch {
    // Even if listings are unreachable, the static + landing pages still
    // ship — they don't depend on the DB query.
    return [...staticRoutes, ...landingRoutes]
  }
}
