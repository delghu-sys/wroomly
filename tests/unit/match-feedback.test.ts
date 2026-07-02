import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyFeedbackNudge } from '../../src/lib/match/feedback.ts'
import type { MatchProfile, MatchReason } from '../../src/types/database.ts'

function profile(over: Partial<MatchProfile> = {}): MatchProfile {
  return structuredClone({
    version: 2 as const,
    budget: { min: 800, max: 1200, stretch_max: 1400, stretch_reason: null },
    timing: { move_in: '2027-05-01', move_out: '2027-08-15', lease_type: 'sublet' as const, duration_months: null, flexibility: 'some' as const },
    space: { whole_unit: true, bedrooms_min: 2, bathrooms_min: null, roommates_ok: null, gender_pref: null },
    location: { anchors: [], neighborhoods: ['Kerrytown'] },
    lifestyle: { tags: [], notes: null },
    amenities: { required: [], preferred: ['Parking'] },
    furnished: true,
    pets_required: null,
    priorities: ['budget', 'location'] as MatchProfile['priorities'],
    dealbreakers: [],
    weights: { budget: 0.9, location: 0.8, furnished: 0.4, amenities: 0.5 },
    summary: null,
    ...over,
  })
}

const fit = (attr: MatchReason['attr'], detail = 'x'): MatchReason => ({ kind: 'fit', attr, detail })
const miss = (attr: MatchReason['attr'], detail = 'x'): MatchReason => ({ kind: 'miss', attr, detail })

test('thumbs-down decays fit weights and boosts miss weights', () => {
  const p = profile()
  const next = applyFeedbackNudge(p, [fit('location'), miss('furnished')], 'down')
  assert.ok(next.weights.location! < p.weights.location!)
  assert.ok(next.weights.furnished! > p.weights.furnished!)
  // Untouched attribute stays put.
  assert.equal(next.weights.amenities, p.weights.amenities)
})

test('thumbs-up reinforces fits and softens misses', () => {
  const p = profile()
  const next = applyFeedbackNudge(p, [fit('location'), miss('furnished')], 'up')
  assert.ok(next.weights.location! > p.weights.location!)
  assert.ok(next.weights.furnished! < p.weights.furnished!)
})

test('weights stay clamped to [0.05, 1]', () => {
  let p = profile({ weights: { location: 0.06, budget: 0.99 } })
  for (let i = 0; i < 60; i++) {
    p = applyFeedbackNudge(p, [fit('location'), miss('budget')], 'down')
  }
  assert.ok(p.weights.location! >= 0.05)
  assert.ok(p.weights.budget! <= 1)
})

test('never resurrects an attribute the profile does not weight', () => {
  const p = profile({ weights: { budget: 0.9 } })
  const next = applyFeedbackNudge(p, [miss('pets')], 'down')
  assert.equal(next.weights.pets, undefined)
})

test('thumbs-down on a stretch-priced listing tightens stretch_max', () => {
  const p = profile() // max 1200, stretch 1400
  const next = applyFeedbackNudge(
    p,
    [fit('budget', '$1,300/mo — over your $1,200 budget but within your stretch')],
    'down',
  )
  assert.equal(next.budget.stretch_max, 1300) // halved toward max
  const again = applyFeedbackNudge(
    next,
    [fit('budget', 'over your budget but within your stretch')],
    'down',
  )
  assert.equal(again.budget.stretch_max, 1250)
})

test('stretch collapses to null once within $25 of max', () => {
  const p = profile({ budget: { min: 800, max: 1200, stretch_max: 1240, stretch_reason: null } })
  const next = applyFeedbackNudge(
    p,
    [fit('budget', 'within your stretch')],
    'down',
  )
  assert.equal(next.budget.stretch_max, null)
})

test('thumbs-down on an in-budget listing leaves stretch alone', () => {
  const p = profile()
  const next = applyFeedbackNudge(p, [fit('budget', '$1,100/mo — inside your budget')], 'down')
  assert.equal(next.budget.stretch_max, 1400)
})

test('input profile is never mutated', () => {
  const p = profile()
  const snapshot = JSON.stringify(p)
  applyFeedbackNudge(p, [fit('location'), miss('budget', 'within your stretch')], 'down')
  assert.equal(JSON.stringify(p), snapshot)
})
