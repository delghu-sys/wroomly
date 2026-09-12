import 'server-only'
import { fetchRentSample } from './fetch-listings'
import { computeAvailability, summarizeRows, type RentStats } from './rent-math'

/**
 * Server layer over the pure maths in `rent-math.ts`. Kept separate so the
 * computation that produces our published statistics can be unit-tested
 * without a database (`server-only` cannot be imported by a test runner).
 *
 * Everything from rent-math is re-exported, so call sites keep importing from
 * '@/lib/seo/rent-stats' unchanged.
 */
export * from './rent-math'

export async function computeRentStats(): Promise<RentStats> {
  const rows = (await fetchRentSample()).filter(
    r => r.price_per_month != null && r.price_per_month > 0,
  )
  return { ...summarizeRows(rows), availability: computeAvailability(rows) }
}
