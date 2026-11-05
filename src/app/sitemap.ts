import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'
import { BUILDINGS } from '@/lib/seo/buildings'
import { GUIDES } from '@/lib/seo/guides'
import { buildSitemap, type ListingStamp } from '@/lib/seo/sitemap-entries'

/**
 * Dynamic sitemap: public pages, the SEO landing pages and every active
 * listing. User profiles and the sign-in and sign-up pages are excluded.
 * The rules (which pages, which dates) live in `buildSitemap`, which is pure
 * and unit-tested.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Best-effort listings: if Supabase is unreachable, the static and landing
  // pages still ship.
  //
  // `status = 'active'` is also the test-data exclusion: placeholder listings
  // are set to 'archived' (reversible) so they drop out of the sitemap, the
  // browse grid and structured data without a schema change.
  let listings: ListingStamp[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select('id, updated_at, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5000)
    listings = (data ?? []) as ListingStamp[]
  } catch {
    listings = []
  }

  return buildSitemap({
    listings,
    neighborhoods: NEIGHBORHOOD_CONTENT.map(n => n.slug),
    buildings: BUILDINGS.map(b => b.slug),
    guides: GUIDES.map(g => ({ slug: g.slug, updated: g.updated })),
  })
}
