import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
import type { ListingWithDetails } from '@/types/database'

// Runs under the session/anon client, so it must not `select('*')` — the
// anon/authenticated roles can't read the columns locked by migration 035.
const LISTING_SELECT = `
  ${PUBLIC_LISTING_COLUMNS},
  listing_images(*),
  listing_amenities(*),
  swap_preferences(*),
  users:supplier_id(id, full_name, avatar_url, university, is_verified)
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

export interface RentSampleRow {
  price_per_month: number | null // cents
  bedrooms: number | null
  neighborhood: string | null
  furnished: boolean
}

/**
 * Minimal price sample of every active listing, for the live rent-prices
 * guide. Only aggregate stats are ever rendered from this — no listing
 * details — so the tiny select keeps it cheap.
 */
export async function fetchRentSample(): Promise<RentSampleRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select('price_per_month, bedrooms, neighborhood, furnished')
    .eq('status', 'active')
    .not('price_per_month', 'is', null)
    .limit(1000)
  return (data ?? []) as RentSampleRow[]
}
