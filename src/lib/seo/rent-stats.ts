import 'server-only'
import { fetchRentSample, type RentSampleRow } from './fetch-listings'

/**
 * Aggregate rent statistics derived from live listings.
 *
 * This is Wroomly's one genuinely proprietary dataset: real asking rents for
 * Ann Arbor student housing, which no national listing site publishes broken
 * out this way. It is also the most citable thing on the site — AI answer
 * engines quote specific numbers with a stated sample and date far more
 * readily than prose.
 *
 * Single source of truth on purpose: /guides/ann-arbor-rent-prices, the
 * neighborhood pages and /llms.txt all read these same functions, so a figure
 * quoted in one place can never disagree with another.
 */

/** Buckets thinner than this are reported as null rather than published from
 *  a sample too small to mean anything. Matches the rent-prices guide. */
export const MIN_SAMPLE = 3

export function median(cents: number[]): number {
  const s = [...cents].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

const BEDROOM_BUCKETS: [label: string, match: (n: number) => boolean][] = [
  ['Studio', n => n === 0],
  ['1 bedroom', n => n === 1],
  ['2 bedrooms', n => n === 2],
  ['3 bedrooms', n => n === 3],
  ['4+ bedrooms', n => n >= 4],
]

export interface RentBucket {
  label: string
  count: number
  medianCents: number
}

export interface RentStats {
  /** ISO date the figures were computed — recency is a citation signal. */
  asOf: string
  sampleSize: number
  overallMedianCents: number | null
  minCents: number | null
  maxCents: number | null
  byBedroom: RentBucket[]
  byNeighborhood: RentBucket[]
  furnishedMedianCents: number | null
  furnishedCount: number
  unfurnishedMedianCents: number | null
  unfurnishedCount: number
  /** Median rent divided by bedroom count — the "is sharing cheaper?" answer,
   *  only for buckets where the divisor is exact (so no 4+ bucket). */
  perBedroom: { label: string; bedrooms: number; perBedroomCents: number }[]
}

function bucketMedian(rows: RentSampleRow[]): number | null {
  const prices = rows.map(r => r.price_per_month!).filter(Boolean)
  return prices.length >= MIN_SAMPLE ? median(prices) : null
}

/** Median asking rent within one neighborhood, over the FULL active set. */
export function neighborhoodRent(
  rows: RentSampleRow[],
  neighborhoodName: string,
): { count: number; medianCents: number | null } {
  const bucket = rows.filter(
    r => r.neighborhood === neighborhoodName && r.price_per_month,
  )
  return { count: bucket.length, medianCents: bucketMedian(bucket) }
}

export async function computeRentStats(): Promise<RentStats> {
  const rows = (await fetchRentSample()).filter(
    r => r.price_per_month != null && r.price_per_month > 0,
  )
  const prices = rows.map(r => r.price_per_month!)

  const byBedroom: RentBucket[] = []
  const perBedroom: RentStats['perBedroom'] = []
  for (const [label, match] of BEDROOM_BUCKETS) {
    const bucket = rows.filter(r => r.bedrooms != null && match(r.bedrooms))
    const m = bucketMedian(bucket)
    if (m == null) continue
    byBedroom.push({ label, count: bucket.length, medianCents: m })
    // Exact divisor only: "4+" mixes 4,5,6,7-bed units.
    const beds = label === 'Studio' ? 0 : Number(label[0])
    if (beds >= 1 && label !== '4+ bedrooms') {
      perBedroom.push({ label, bedrooms: beds, perBedroomCents: Math.round(m / beds) })
    }
  }

  const names = [...new Set(rows.map(r => r.neighborhood).filter(Boolean))] as string[]
  const byNeighborhood: RentBucket[] = names
    .map(name => {
      const { count, medianCents } = neighborhoodRent(rows, name)
      return medianCents == null ? null : { label: name, count, medianCents }
    })
    .filter((b): b is RentBucket => b !== null)
    .sort((a, b) => b.count - a.count)

  const furnished = rows.filter(r => r.furnished)
  const unfurnished = rows.filter(r => !r.furnished)

  return {
    asOf: new Date().toISOString().slice(0, 10),
    sampleSize: rows.length,
    overallMedianCents: prices.length >= MIN_SAMPLE ? median(prices) : null,
    minCents: prices.length ? Math.min(...prices) : null,
    maxCents: prices.length ? Math.max(...prices) : null,
    byBedroom,
    byNeighborhood,
    furnishedMedianCents: bucketMedian(furnished),
    furnishedCount: furnished.length,
    unfurnishedMedianCents: bucketMedian(unfurnished),
    unfurnishedCount: unfurnished.length,
    perBedroom,
  }
}
