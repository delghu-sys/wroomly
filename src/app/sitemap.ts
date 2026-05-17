import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

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
  ]

  // Best-effort listings — if Supabase is unreachable at build/edge time, fall
  // back to the static routes only so the sitemap still serves.
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

    return [...staticRoutes, ...listingRoutes]
  } catch {
    return staticRoutes
  }
}
