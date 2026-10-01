import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validatePublishRequirements,
  isInServiceArea,
} from '../../src/lib/listing-import/publish-validation.ts'
import { leadToExtractedDraft } from '../../src/lib/agents/to-draft.ts'

/**
 * This is the server-side gate the publish route runs before any listing
 * goes live, so it — not the UI — is what actually forces a claimer to
 * provide a real address. A check that lived only in the browser would be
 * walked straight past by an edited request.
 */

// A draft complete in every respect except whatever a test changes.
function complete(over: Record<string, unknown> = {}) {
  const d = leadToExtractedDraft({
    title: '721 S Forest Ave',
    sourceLabel: 'test',
    contactEmail: 'p@example.com',
    extracted: { price: '1500', bedrooms: '1', bathrooms: '1', description: 'A bright room near campus.' },
  })
  return {
    ...d,
    description: 'A bright room near campus.',
    availableFrom: '2027-01-01',
    availableTo: '2027-08-31',
    listingType: 'PRIVATE_ROOM',
    address: '721 S Forest Ave',
    lat: 42.2722,
    lng: -83.7352,
    ...over,
  } as Parameters<typeof validatePublishRequirements>[0]
}

const ctx = {
  ownerUserId: 'u1',
  userConfirmedAccuracy: true,
  enrichmentUsed: false,
  userConfirmedEnrichment: false,
  confirmedPhotoCount: 1,
}

const addressProblems = (r: { missing: string[] }) =>
  r.missing.filter(m => /address|map|Ann Arbor/i.test(m))

test('a complete draft with a picked Ann Arbor address passes', () => {
  const r = validatePublishRequirements(complete(), ctx)
  assert.deepEqual(r.missing, [])
})

// ── the address is REQUIRED ─────────────────────────────────────────────────

test('no address at all is refused', () => {
  const r = validatePublishRequirements(complete({ address: null, lat: null, lng: null }), ctx)
  assert.equal(addressProblems(r).length, 1)
  assert.match(addressProblems(r)[0], /Street address/)
})

test('an address that was TYPED but never picked is refused', () => {
  // Text alone has no location; only a picked suggestion supplies one.
  const r = validatePublishRequirements(complete({ lat: null, lng: null }), ctx)
  assert.match(addressProblems(r)[0] ?? '', /Pick your exact address/)
})

test('the AI placeholder that reached production is refused', () => {
  // Verbatim from a live listing, 2026-10-01: non-empty and address-shaped,
  // so a plain presence check passed it while it located nothing.
  const r = validatePublishRequirements(
    complete({ address: '2650 [Street unknown], Ann Arbor, MI', lat: null, lng: null }),
    ctx,
  )
  assert.equal(addressProblems(r).length, 1)
})

// ── and it must be HERE ─────────────────────────────────────────────────────

test('a real address in another state is refused', () => {
  // "123 Main St" geocodes happily to Springfield, Illinois.
  const r = validatePublishRequirements(complete({ address: '123 Main St', lat: 39.7817, lng: -89.6501 }), ctx)
  assert.match(addressProblems(r)[0] ?? '', /Ann Arbor area/)
})

test('a hand-edited request with junk coordinates is refused', () => {
  // Coordinates arrive from the client, so the server cannot trust them.
  for (const [lat, lng] of [[0, 0], [90, 180], [-42.28, 83.74]]) {
    const r = validatePublishRequirements(complete({ lat, lng }), ctx)
    assert.equal(addressProblems(r).length, 1, `${lat},${lng} must not publish`)
  }
})

test('the service area covers Ann Arbor and its neighbours', () => {
  const places: [string, number, number][] = [
    ['Diag', 42.2768, -83.7382],
    ['Kimberley Hills', 42.2507, -83.7171],
    ['Ypsilanti', 42.2411, -83.6130],
    ['Saline', 42.1667, -83.7816],
    ['Dexter', 42.3384, -83.8885],
  ]
  for (const [name, lat, lng] of places) assert.ok(isInServiceArea(lat, lng), `${name} must be inside`)
  assert.equal(isInServiceArea(42.3314, -83.0458), false, 'Detroit is not')
  assert.equal(isInServiceArea(42.7325, -84.5555), false, 'Lansing is not')
})

// ── the description, which drafts used to lack entirely ─────────────────────

test('a draft with no description cannot publish', () => {
  // Why the description matters beyond looks: before it was read from the
  // post, no agent-sourced draft could ever have been published.
  const r = validatePublishRequirements(complete({ description: null }), ctx)
  assert.ok(r.missing.includes('A description'))
})
