import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  scoreListing,
  haversineMeters,
  commuteMinutes,
  MATCH_THRESHOLD,
  type MatchableListing,
} from '../../src/lib/match/engine.ts'
import type { MatchProfile } from '../../src/types/database.ts'

// Local empty profile (profile.ts pulls in zod/date-fns, which node --test
// can't resolve through the path alias — the engine itself is dependency-free).
const EMPTY: MatchProfile = {
  version: 2,
  budget: { min: null, max: null, stretch_max: null, stretch_reason: null },
  timing: { move_in: null, move_out: null, lease_type: null, duration_months: null, flexibility: 'some' },
  space: { whole_unit: null, bedrooms_min: null, bathrooms_min: null, roommates_ok: null, gender_pref: null },
  location: { anchors: [], neighborhoods: [] },
  lifestyle: { tags: [], notes: null },
  amenities: { required: [], preferred: [] },
  furnished: null,
  pets_required: null,
  priorities: [],
  dealbreakers: [],
  weights: {},
  summary: null,
}

const DIAG = { lat: 42.277, lng: -83.7382 }

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
    lat: 42.2846,
    lng: -83.7454,
    furnished: true,
    pets_allowed: false,
    amenities: ['Laundry In-Unit', 'Parking'],
    ...over,
  }
}

function profile(over: Partial<MatchProfile> = {}): MatchProfile {
  return structuredClone({ ...EMPTY, ...over })
}

/** A rich profile that the default listing() satisfies completely. */
function fullFitProfile(): MatchProfile {
  return profile({
    budget: { min: 800, max: 1200, stretch_max: 1400, stretch_reason: null },
    timing: { move_in: '2027-05-15', move_out: '2027-08-01', lease_type: 'sublet', duration_months: null, flexibility: 'some' },
    space: { whole_unit: true, bedrooms_min: 2, bathrooms_min: 1, roommates_ok: null, gender_pref: null },
    location: { anchors: [], neighborhoods: ['Kerrytown'] },
    furnished: true,
    amenities: { required: ['Parking'], preferred: ['Laundry In-Unit'] },
    priorities: ['budget', 'location', 'timing'],
    weights: { budget: 0.9, location: 0.8, timing: 0.7, space: 0.6, furnished: 0.4, amenities: 0.5 },
  })
}

// ── Basics ──────────────────────────────────────────────────────────────────

test('non-sublet listings never match', () => {
  const r = scoreListing(listing({ type: 'swap' }), fullFitProfile())
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
})

test('empty profile yields no match', () => {
  const r = scoreListing(listing(), profile())
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
})

test('a fully-matching listing scores 100 with fit reasons for every attribute', () => {
  const r = scoreListing(listing(), fullFitProfile())
  assert.equal(r.pass, true)
  assert.equal(r.score, 100)
  assert.ok(r.fits.length >= 5)
  assert.equal(r.misses.length, 0)
  const attrs = r.fits.map(f => f.attr)
  for (const a of ['budget', 'location', 'timing', 'space', 'furnished', 'amenities']) {
    assert.ok(attrs.includes(a as never), `expected fit for ${a}`)
  }
  // Reasons are machine-readable {kind, attr, detail}.
  for (const f of r.fits) {
    assert.equal(f.kind, 'fit')
    assert.equal(typeof f.detail, 'string')
    assert.ok(f.detail.length > 0)
  }
})

// ── Dealbreakers & hard cuts ────────────────────────────────────────────────

test('dealbreaker attribute failing is a hard cut with a recorded miss', () => {
  const p = fullFitProfile()
  p.pets_required = true
  p.weights.pets = 0.7
  p.dealbreakers = [{ attr: 'pets', description: 'Has a cat' }]
  const r = scoreListing(listing({ pets_allowed: false }), p)
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
  assert.ok(r.misses.some(m => m.attr === 'pets'))
})

test('same failure without the dealbreaker only drags the score', () => {
  const p = fullFitProfile()
  p.pets_required = true
  p.weights.pets = 0.7
  const r = scoreListing(listing({ pets_allowed: false }), p)
  assert.ok(r.score > 0, 'soft failure should not zero the score')
  assert.ok(r.score < 100)
  assert.ok(r.misses.some(m => m.attr === 'pets'))
})

test('missing a REQUIRED amenity is always a hard cut', () => {
  const p = fullFitProfile()
  p.amenities.required = ['Dishwasher']
  const r = scoreListing(listing(), p)
  assert.equal(r.pass, false)
  assert.equal(r.score, 0)
  assert.ok(r.misses.some(m => m.attr === 'amenities' && /dishwasher/i.test(m.detail)))
})

test('price beyond the stretch ceiling is a hard cut', () => {
  const r = scoreListing(listing({ price_per_month: 150000 }), fullFitProfile()) // $1,500 > $1,400 stretch
  assert.equal(r.pass, false)
  assert.ok(r.misses.some(m => m.attr === 'budget'))
})

test('no date overlap is a hard cut', () => {
  const p = fullFitProfile()
  p.timing.move_in = '2027-09-01'
  p.timing.move_out = '2027-12-15'
  const r = scoreListing(listing(), p)
  assert.equal(r.pass, false)
  assert.ok(r.misses.some(m => m.attr === 'timing'))
})

test('rigid timing rejects partial coverage; flexible accepts it', () => {
  const partial = { move_in: '2027-04-01', move_out: '2027-08-01' } // listing starts May 1
  const rigid = fullFitProfile()
  rigid.timing = { ...rigid.timing, ...partial, flexibility: 'rigid' }
  assert.equal(scoreListing(listing(), rigid).pass, false)

  const flexible = fullFitProfile()
  flexible.timing = { ...flexible.timing, ...partial, flexibility: 'flexible' }
  const r = scoreListing(listing(), flexible)
  assert.ok(r.score > 0)
})

// ── Stretch-budget forgiveness ──────────────────────────────────────────────

test('over budget passes when top priorities score strongly', () => {
  // $1,300: over the $1,200 max, inside the $1,400 stretch. Everything else fits.
  const r = scoreListing(listing({ price_per_month: 130000 }), fullFitProfile())
  assert.equal(r.pass, true, `expected pass, got score ${r.score}`)
  assert.ok(r.fits.some(f => f.attr === 'budget' && /stretch/.test(f.detail)))
})

test('over budget scores lower when priorities are NOT delivered', () => {
  const good = scoreListing(listing({ price_per_month: 130000 }), fullFitProfile())
  const p = fullFitProfile()
  const r = scoreListing(
    // Wrong neighborhood + late dates: location and timing (their top
    // priorities alongside budget) both miss.
    listing({ price_per_month: 130000, neighborhood: 'Pittsfield', available_from: '2027-07-20' }),
    p,
  )
  assert.ok(r.score < good.score, `${r.score} should be < ${good.score}`)
})

// ── Location: anchors + neighborhoods ───────────────────────────────────────

test('anchor within max_minutes gets full location credit', () => {
  const p = fullFitProfile()
  p.location = {
    neighborhoods: [],
    anchors: [{ name: 'The Diag / Central Campus', ...DIAG, max_minutes: 20, mode: 'walk' }],
  }
  // Kerrytown listing ≈ 1km from the Diag ≈ 16 min walk with route factor.
  const r = scoreListing(listing(), p)
  assert.equal(r.pass, true)
  assert.ok(r.fits.some(f => f.attr === 'location' && /min walk/.test(f.detail)))
})

test('anchor far past the limit zeroes location credit', () => {
  const p = fullFitProfile()
  p.location = {
    neighborhoods: [],
    anchors: [{ name: 'The Diag / Central Campus', ...DIAG, max_minutes: 5, mode: 'walk' }],
  }
  const r = scoreListing(listing(), p)
  assert.ok(r.misses.some(m => m.attr === 'location'))
})

test('either anchors or neighborhoods can satisfy location (max wins)', () => {
  const p = fullFitProfile()
  p.location = {
    neighborhoods: ['Kerrytown'], // listing is in Kerrytown → full credit
    anchors: [{ name: 'The Diag / Central Campus', ...DIAG, max_minutes: 5, mode: 'walk' }], // would fail
  }
  const r = scoreListing(listing(), p)
  assert.ok(r.fits.some(f => f.attr === 'location'))
})

test('listing without coordinates falls back to neighborhoods', () => {
  const p = fullFitProfile()
  p.location = {
    neighborhoods: ['Kerrytown'],
    anchors: [{ name: 'The Diag / Central Campus', ...DIAG, max_minutes: 20, mode: 'walk' }],
  }
  const r = scoreListing(listing({ lat: null, lng: null }), p)
  assert.ok(r.fits.some(f => f.attr === 'location' && /Kerrytown/.test(f.detail)))
})

// ── Weights & priorities ────────────────────────────────────────────────────

test('priority ranking boosts an attribute weight', () => {
  // Identical weights; the only difference is whether the missing attribute
  // (furnished) is the renter's #1 priority.
  const base = profile({
    budget: { min: null, max: 1200, stretch_max: null, stretch_reason: null },
    furnished: true,
    weights: { budget: 0.5, furnished: 0.5 },
  })
  const notPriority = structuredClone(base)
  notPriority.priorities = ['budget']
  const isPriority = structuredClone(base)
  isPriority.priorities = ['furnished']

  const unfurnished = listing({ furnished: false })
  const a = scoreListing(unfurnished, notPriority)
  const b = scoreListing(unfurnished, isPriority)
  assert.ok(b.score < a.score, `furnished-as-#1-priority should hurt more: ${b.score} < ${a.score}`)
})

test('zero-weight attributes are ignored in the score', () => {
  const p = profile({
    budget: { min: null, max: 1200, stretch_max: null, stretch_reason: null },
    furnished: true,
    weights: { budget: 0.9 }, // furnished set but unweighted
  })
  const r = scoreListing(listing({ furnished: false }), p)
  assert.equal(r.score, 100)
})

// ── Amenities: required vs preferred ────────────────────────────────────────

test('preferred amenities give partial credit instead of cutting', () => {
  const p = profile({
    budget: { min: null, max: 1200, stretch_max: null, stretch_reason: null },
    amenities: { required: [], preferred: ['Parking', 'Dishwasher'] },
    weights: { budget: 0.5, amenities: 0.5 },
  })
  const r = scoreListing(listing(), p) // has Parking, no Dishwasher
  assert.ok(r.score > 50 && r.score < 100, `partial credit expected, got ${r.score}`)
})

// ── Helpers ─────────────────────────────────────────────────────────────────

test('haversine + commute minutes are sane for Ann Arbor scale', () => {
  // Kerrytown → Diag is roughly a kilometer.
  const m = haversineMeters(42.2846, -83.7454, DIAG.lat, DIAG.lng)
  assert.ok(m > 700 && m < 1400, `${m}m`)
  const walk = commuteMinutes(m, 'walk')
  const bike = commuteMinutes(m, 'bike')
  assert.ok(walk > bike)
  assert.ok(walk > 8 && walk < 20, `${walk} min`)
})

test('threshold export is on the 0–100 scale', () => {
  assert.ok(MATCH_THRESHOLD > 1 && MATCH_THRESHOLD <= 100)
})
