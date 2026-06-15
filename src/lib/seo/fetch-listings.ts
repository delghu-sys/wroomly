import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'

const LISTING_SELECT = `
  *,
  listing_images(*),
  listing_amenities(*),
  swap_preferences(*),
  users:supplier_id(id, full_name, avatar_url, university)
`

/**
 * Fetch active listings for an SEO landing page, filtered by either
 * neighborhood or residence_name (building). status='active' keeps test
 * / archived listings out of indexable pages automatically.
 */
export async function fetchActiveListings(
  filter: { neighborhood: string } | { residenceName: string },
  limit = 24,
): Promise<ListingWithDetails[]> {
  const supabase = await createClient()
  let q = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if ('neighborhood' in filter) {
    q = q.eq('neighborhood', filter.neighborhood)
  } else {
    q = q.eq('residence_name', filter.residenceName)
  }

  const { data } = await q
  return (data ?? []) as unknown as ListingWithDetails[]
}
