import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  walkToCampus,
  haversineMeters,
  CENTRAL_CAMPUS,
  NORTH_CAMPUS,
} from '../../src/lib/campus.ts'

// Real Ann Arbor addresses, coordinates from their street addresses.
const VERVE = { lat: 42.2745, lng: -83.7327 } // 721 S Forest Ave
const SIX11 = { lat: 42.2757, lng: -83.7365 } // 611 E University Ave
const THE_YARD = { lat: 42.2733, lng: -83.7492 } // 615 S Main St
const COURTYARDS = { lat: 42.2949, lng: -83.7139 } // 1780 Broadway St
const DETROIT = { lat: 42.3314, lng: -83.0458 } // ~40 miles away

test('returns null without usable coordinates', () => {
  assert.equal(walkToCampus(null, null), null)
  assert.equal(walkToCampus(42.277, null), null)
  assert.equal(walkToCampus(undefined, undefined), null)
  assert.equal(walkToCampus(NaN, -83.7382), null)
})

test('a listing on top of the Diag still reports at least 1 minute', () => {
  const r = walkToCampus(CENTRAL_CAMPUS.lat, CENTRAL_CAMPUS.lng)
  assert.ok(r)
  assert.equal(r.minutes, 1)
})

test('central-campus listings measure against the Diag', () => {
  for (const spot of [VERVE, SIX11, THE_YARD]) {
    const r = walkToCampus(spot.lat, spot.lng)
    assert.ok(r)
    assert.equal(r.anchor.label, 'the Diag')
  }
})

test('North Campus listings measure against North Campus, not the Diag', () => {
  const r = walkToCampus(COURTYARDS.lat, COURTYARDS.lng)
  assert.ok(r)
  assert.equal(r.anchor.label, 'North Campus')
  // Courtyards advertises about a six-minute walk to North Campus.
  assert.ok(r.minutes <= 12, `expected a short walk, got ${r.minutes}`)
  // Measuring against the Diag instead would give a much larger, useless number.
  const toDiag = Math.round(
    haversineMeters(
      COURTYARDS.lat,
      COURTYARDS.lng,
      CENTRAL_CAMPUS.lat,
      CENTRAL_CAMPUS.lng,
    ) / 64,
  )
  assert.ok(toDiag > r.minutes * 2, 'North Campus should be the nearer anchor')
})

test('matches The Yard\'s own published 18-minute walk within a few minutes', () => {
  // The only building that publishes BOTH a distance and a time, so it's the
  // one real calibration point available.
  const r = walkToCampus(THE_YARD.lat, THE_YARD.lng)
  assert.ok(r)
  assert.ok(
    r.minutes >= 13 && r.minutes <= 18,
    `expected 13-18 min against their stated 18, got ${r.minutes}`,
  )
})

test('never over-promises: estimate is not faster than a 5km/h straight line', () => {
  // Straight-line at full walking pace is the physical floor; a real route is
  // always longer. Our number must never come in under it.
  for (const spot of [VERVE, SIX11, THE_YARD, COURTYARDS]) {
    const r = walkToCampus(spot.lat, spot.lng)
    assert.ok(r)
    const straightLineMin =
      haversineMeters(spot.lat, spot.lng, r.anchor.lat, r.anchor.lng) / 83.3
    assert.ok(
      r.minutes >= Math.floor(straightLineMin),
      `${r.minutes} min undercuts the straight-line floor of ${straightLineMin.toFixed(1)}`,
    )
  }
})

test('suppresses the number when walking is not how anyone would get there', () => {
  assert.equal(walkToCampus(DETROIT.lat, DETROIT.lng), null)
})

test('label reads as a sentence fragment, not a data dump', () => {
  const r = walkToCampus(VERVE.lat, VERVE.lng)
  assert.ok(r)
  assert.match(r.label, /^\d+ min walk to (the Diag|North Campus)$/)
})

test('anchors are where they should be', () => {
  // Guards against a fat-fingered coordinate silently shifting every number.
  assert.ok(haversineMeters(42.277, -83.7382, CENTRAL_CAMPUS.lat, CENTRAL_CAMPUS.lng) < 50)
  assert.ok(haversineMeters(42.2912, -83.7175, NORTH_CAMPUS.lat, NORTH_CAMPUS.lng) < 50)
  // The two campuses are genuinely ~2.5 km apart.
  const apart = haversineMeters(
    CENTRAL_CAMPUS.lat,
    CENTRAL_CAMPUS.lng,
    NORTH_CAMPUS.lat,
    NORTH_CAMPUS.lng,
  )
  assert.ok(apart > 2000 && apart < 3200, `${Math.round(apart)}m between campuses`)
})
