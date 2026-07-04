import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isNewListing, NEW_LISTING_WINDOW_MS } from '../../src/lib/utils/listing.ts'

// "New" badge honesty (docs/social-share-audit.md item 3): one shared
// definition, strictly time-based, never true for future or unparseable dates.

test('isNewListing: true within the 72h window', () => {
  const now = new Date('2026-07-04T12:00:00Z')
  assert.equal(isNewListing('2026-07-04T00:00:00Z', now), true)
  assert.equal(isNewListing('2026-07-02T12:00:00Z', now), true) // 48h — still new
})

test('isNewListing: false right after the window closes', () => {
  const now = new Date('2026-07-04T12:00:00Z')
  const justOutside = new Date(now.getTime() - NEW_LISTING_WINDOW_MS - 1000).toISOString()
  assert.equal(isNewListing(justOutside, now), false)
})

test('isNewListing: false for future timestamps (clock skew never fabricates a badge)', () => {
  const now = new Date('2026-07-04T12:00:00Z')
  assert.equal(isNewListing('2026-07-05T00:00:00Z', now), false)
})

test('isNewListing: false for garbage input', () => {
  assert.equal(isNewListing('not-a-date'), false)
  assert.equal(isNewListing(''), false)
})
