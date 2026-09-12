import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_SAMPLE,
  median,
  usd,
  neighborhoodRent,
  computeAvailability,
  summarizeRows,
  type PricedRow,
} from '../../src/lib/seo/rent-math.ts'

// These functions decide the numbers published on /llms.txt, the rent guide
// and all 11 neighborhood pages — figures AI engines may quote and attribute
// to Wroomly. Every test below guards against publishing something wrong.

function row(p: Partial<PricedRow> & { price_per_month: number }): PricedRow {
  return {
    bedrooms: 1,
    neighborhood: 'Kerrytown',
    furnished: false,
    available_from: '2026-08-01',
    available_to: '2027-07-31',
    ...p,
  }
}
const priced = (...cents: number[]) => cents.map(c => row({ price_per_month: c }))

// ── median ──────────────────────────────────────────────────────────────────
test('median: odd sample takes the middle value', () => {
  assert.equal(median([300, 100, 200]), 200) // unsorted input must be sorted
})

test('median: even sample averages the two middle values', () => {
  assert.equal(median([100, 200, 300, 400]), 250)
})

test('median: even sample rounds to a whole cent', () => {
  assert.equal(median([100, 101]), 101) // Math.round(100.5)
})

test('median: does not mutate its input', () => {
  const input = [300, 100, 200]
  median(input)
  assert.deepEqual(input, [300, 100, 200])
})

// ── usd ─────────────────────────────────────────────────────────────────────
test('usd: converts cents to dollars with a thousands separator', () => {
  assert.equal(usd(197500), '$1,975')
  assert.equal(usd(90000), '$900')
})

// ── the suppression guard ───────────────────────────────────────────────────
test('a bucket under MIN_SAMPLE is never published', () => {
  assert.equal(MIN_SAMPLE, 3)
  const s = summarizeRows(priced(100000, 200000)) // only 2 listings
  assert.equal(s.overallMedianCents, null, 'must not publish a median from n=2')
})

test('a bucket exactly at MIN_SAMPLE is published', () => {
  const s = summarizeRows(priced(100000, 200000, 300000))
  assert.equal(s.overallMedianCents, 200000)
})

// ── neighborhoodRent ────────────────────────────────────────────────────────
test('neighborhoodRent counts only that neighborhood', () => {
  const rows = [
    ...priced(100000, 200000, 300000),
    row({ price_per_month: 999900, neighborhood: 'Burns Park' }),
  ]
  const k = neighborhoodRent(rows, 'Kerrytown')
  assert.equal(k.count, 3)
  assert.equal(k.medianCents, 200000, 'the Burns Park outlier must not leak in')
})

test('neighborhoodRent suppresses a thin neighborhood', () => {
  const rows = [row({ price_per_month: 150000, neighborhood: 'Water Hill' })]
  const w = neighborhoodRent(rows, 'Water Hill')
  assert.equal(w.count, 1)
  assert.equal(w.medianCents, null, 'n=1 must not produce a published median')
})

test('neighborhoodRent returns zero/null for an unknown neighborhood', () => {
  const r = neighborhoodRent(priced(100000, 200000, 300000), 'Nowhere')
  assert.deepEqual(r, { count: 0, medianCents: null })
})

// ── availability: the impossible-date bug ───────────────────────────────────
test('availability DISCARDS a range that ends before it starts', () => {
  // This is the real row that was live: 2026-08-10 -> 2026-07-31.
  const rows = [
    ...Array.from({ length: 3 }, () =>
      row({ price_per_month: 100000, available_from: '2026-08-01', available_to: '2027-07-31' }),
    ),
    row({ price_per_month: 100000, available_from: '2026-08-10', available_to: '2026-07-31' }),
  ]
  const a = computeAvailability(rows)
  assert.equal(a.validCount, 3, 'the impossible row must be excluded, not clamped')
  assert.equal(a.byMonth.reduce((n, m) => n + m.count, 0), 3)
})

test('availability discards rows with missing or unparseable dates', () => {
  const rows = [
    ...Array.from({ length: 3 }, () => row({ price_per_month: 100000 })),
    row({ price_per_month: 100000, available_from: null, available_to: '2027-07-31' }),
    row({ price_per_month: 100000, available_from: 'not-a-date', available_to: '2027-07-31' }),
  ]
  assert.equal(computeAvailability(rows).validCount, 3)
})

test('availability reports month counts and shares, busiest first', () => {
  const aug = Array.from({ length: 3 }, () =>
    row({ price_per_month: 100000, available_from: '2026-08-01', available_to: '2027-07-31' }),
  )
  const jul = [row({ price_per_month: 100000, available_from: '2026-07-01', available_to: '2027-06-30' })]
  const a = computeAvailability([...jul, ...aug])
  assert.equal(a.byMonth[0].month, 'August', 'busiest month must sort first')
  assert.equal(a.byMonth[0].count, 3)
  assert.equal(a.byMonth[0].sharePct, 75)
  assert.equal(a.julyAugustSharePct, 100)
})

test('availability medianTermMonths reflects a 12-month lease', () => {
  const rows = Array.from({ length: 3 }, () =>
    row({ price_per_month: 100000, available_from: '2026-08-01', available_to: '2027-08-01' }),
  )
  assert.equal(computeAvailability(rows).medianTermMonths, 12)
})

test('availability on an empty set does not divide by zero', () => {
  const a = computeAvailability([])
  assert.equal(a.validCount, 0)
  assert.equal(a.julyAugustSharePct, 0)
  assert.equal(a.medianTermMonths, null)
  assert.deepEqual(a.byMonth, [])
})

// ── per-bedroom: the ambiguous-divisor guard ────────────────────────────────
test('perBedroom divides by the exact bedroom count', () => {
  const rows = Array.from({ length: 3 }, () => row({ price_per_month: 200000, bedrooms: 2 }))
  const s = summarizeRows(rows)
  const two = s.perBedroom.find(p => p.bedrooms === 2)
  assert.equal(two?.perBedroomCents, 100000, '$2,000 / 2 beds = $1,000 per bedroom')
})

test('perBedroom EXCLUDES the 4+ bucket and Studios', () => {
  const rows = [
    ...Array.from({ length: 3 }, () => row({ price_per_month: 400000, bedrooms: 5 })),
    ...Array.from({ length: 3 }, () => row({ price_per_month: 145000, bedrooms: 0 })),
  ]
  const s = summarizeRows(rows)
  // "4+ bedrooms" mixes 4/5/6/7-bed units, so any divisor would be wrong.
  assert.equal(s.perBedroom.find(p => p.label === '4+ bedrooms'), undefined)
  assert.equal(s.perBedroom.find(p => p.bedrooms === 0), undefined)
})

// ── summarize ───────────────────────────────────────────────────────────────
test('summarize splits furnished from unfurnished', () => {
  const rows = [
    ...Array.from({ length: 3 }, () => row({ price_per_month: 200000, furnished: true })),
    ...Array.from({ length: 3 }, () => row({ price_per_month: 180000, furnished: false })),
  ]
  const s = summarizeRows(rows)
  assert.equal(s.furnishedMedianCents, 200000)
  assert.equal(s.furnishedCount, 3)
  assert.equal(s.unfurnishedMedianCents, 180000)
  assert.equal(s.unfurnishedCount, 3)
})

test('summarize orders neighborhoods by listing count, busiest first', () => {
  const rows = [
    ...Array.from({ length: 3 }, () => row({ price_per_month: 200000, neighborhood: 'Downtown' })),
    ...Array.from({ length: 5 }, () => row({ price_per_month: 190000, neighborhood: 'Kerrytown' })),
  ]
  const s = summarizeRows(rows)
  assert.deepEqual(s.byNeighborhood.map(b => b.label), ['Kerrytown', 'Downtown'])
})

test('summarize reports the true min and max of the sample', () => {
  const s = summarizeRows(priced(90000, 197500, 760800))
  assert.equal(s.minCents, 90000)
  assert.equal(s.maxCents, 760800)
})
