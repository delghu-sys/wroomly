import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  scoreListing,
  matchReasonLine,
  MATCH_THRESHOLD,
  type MatchableListing,
} from '../../src/lib/match/engine.ts'
import type { MatchCriteria } from '../../src/types/database.ts'

const EMPTY: MatchCriteria = {
  budget_min: null,
  budget_max: null,
  bedrooms_min: null,
  whole_unit: null,
  bathrooms_min: null,
  lease_type: null,
  date_start: null,
  date_end: null,
  neighborhoods: [],
  furnished: null,
  amenities: [],
  pets_required: null,
  roommate_pref: null,
  notes: null,
}

function listing(over: Partial<MatchableListing> = {}): MatchableListing {
  return {
    id: 'l1',
    type: 'sublet',
    title: 'Sunny 2-bed',
    price_per_month: 100000, // $1,000 in cents
    bedrooms: 2,
    bathrooms: 1,
    available_from: '2027-05-01',
    available_to: '2027-08-15',
    neighborhood: 'Kerrytown',
    furnished: true,
    pets_allowed: false,
    amenities: ['Laundry In-Unit', 'Parking'],
    ...over,
  }
}

function criteria(over: Partial<MatchCriteria> = {}): MatchCriteria {
  return { ...EMPTY, ...over }
}

test('swap listings never match (renters have nothing to swap)', () => {
  const r = scoreListing(listing({ type: 'swap' }), criteria({ budget_max: 1200 }))
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
})

test('empty criteria yields no meaningful match', () => {
  const r = scoreListing(listing(), EMPTY)
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
})

test('price within budget passes; well under scores higher than at-max', () => {
  const under = scoreListing(listing({ price_per_month: 80000 }), criteria({ budget_max: 1200 }))
  const atMax = scoreListing(listing({ price_per_month: 120000 }), criteria({ budget_max: 1200 }))
  assert.equal(under.pass, true)
  assert.equal(atMax.pass, true)
  assert.ok(under.score >= atMax.score)
})

test('price over budget beyond tolerance fails', () => {
  // $1,400 against a $1,200 max (8% tolerance = $1,296) → fail
  const r = scoreListing(listing({ price_per_month: 140000 }), criteria({ budget_max: 1200 }))
  assert.equal(r.pass, false)
})

test('price just inside tolerance band still passes', () => {
  // $1,250 against $1,200 max (tolerance to $1,296) → pass, slightly tapered
  const r = scoreListing(listing({ price_per_month: 125000 }), criteria({ budget_max: 1200 }))
  assert.equal(r.pass, true)
})

test('below budget_min fails', () => {
  const r = scoreListing(listing({ price_per_month: 50000 }), criteria({ budget_min: 900 }))
  assert.equal(r.pass, false)
})

test('bedrooms below minimum fails, meeting it passes', () => {
  const tooFew = scoreListing(listing({ bedrooms: 1 }), criteria({ bedrooms_min: 2 }))
  const enough = scoreListing(listing({ bedrooms: 3 }), criteria({ bedrooms_min: 2 }))
  assert.equal(tooFew.pass, false)
  assert.equal(enough.pass, true)
})

test('date windows must overlap', () => {
  // Desired Jun–Jul; listing May 1–Aug 15 overlaps → pass
  const ok = scoreListing(listing(), criteria({ date_start: '2027-06-01', date_end: '2027-07-31' }))
  assert.equal(ok.pass, true)
  // Desired Dec; listing ends Aug 15 → no overlap → fail
  const no = scoreListing(listing(), criteria({ date_start: '2027-12-01', date_end: '2027-12-31' }))
  assert.equal(no.pass, false)
})

test('neighborhood must be in the requested set', () => {
  const ok = scoreListing(listing({ neighborhood: 'Kerrytown' }), criteria({ neighborhoods: ['Kerrytown', 'Downtown'] }))
  const no = scoreListing(listing({ neighborhood: 'Pittsfield' }), criteria({ neighborhoods: ['Kerrytown', 'Downtown'] }))
  assert.equal(ok.pass, true)
  assert.equal(no.pass, false)
})

test('required amenities must all be present', () => {
  const ok = scoreListing(listing({ amenities: ['Laundry In-Unit', 'Parking', 'Gym'] }), criteria({ amenities: ['Laundry In-Unit', 'Parking'] }))
  const no = scoreListing(listing({ amenities: ['Parking'] }), criteria({ amenities: ['Laundry In-Unit', 'Parking'] }))
  assert.equal(ok.pass, true)
  assert.equal(no.pass, false)
})

test('furnished requirement is enforced', () => {
  const no = scoreListing(listing({ furnished: false }), criteria({ furnished: true }))
  assert.equal(no.pass, false)
})

test('pet requirement is enforced', () => {
  const no = scoreListing(listing({ pets_allowed: false }), criteria({ pets_required: true }))
  const ok = scoreListing(listing({ pets_allowed: true }), criteria({ pets_required: true }))
  assert.equal(no.pass, false)
  assert.equal(ok.pass, true)
})

test('a fully-matching listing scores at or above threshold and yields reasons', () => {
  const r = scoreListing(
    listing({ price_per_month: 90000 }),
    criteria({
      budget_max: 1200,
      bedrooms_min: 2,
      date_start: '2027-06-01',
      date_end: '2027-07-31',
      neighborhoods: ['Kerrytown'],
      furnished: true,
      amenities: ['Laundry In-Unit'],
    }),
  )
  assert.equal(r.pass, true)
  assert.ok(r.score >= MATCH_THRESHOLD)
  assert.ok(r.reasons.length > 0)
  const line = matchReasonLine(r.reasons)
  assert.match(line, /\/mo/)
  assert.match(line, /Kerrytown/)
})

test('null listing fields do not hard-fail when criteria omit them', () => {
  const r = scoreListing(
    listing({ bedrooms: null, bathrooms: null }),
    criteria({ budget_max: 1500 }),
  )
  assert.equal(r.pass, true)
})
