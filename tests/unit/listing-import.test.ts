import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  generateClaimToken,
  hashClaimToken,
  claimTokenExpiry,
  isClaimTokenExpired,
} from '../../src/lib/listing-import/claim-token.ts'
import {
  normalizeExtractedListing,
  detectSourceConflicts,
  mapSourceAttribution,
} from '../../src/lib/listing-import/normalize.ts'
import { validatePublishRequirements } from '../../src/lib/listing-import/publish-validation.ts'
import { importInputSchema } from '../../src/lib/listing-import/schema.ts'
import type { ExtractedListingDraft } from '../../src/types/listing-import.ts'

// Minimal valid draft factory.
function draft(over: Partial<ExtractedListingDraft> = {}): ExtractedListingDraft {
  return {
    title: 'Sunny room',
    description: 'A room.',
    rentMonthly: 1000,
    currency: 'USD',
    utilitiesIncluded: null,
    depositAmount: null,
    availableFrom: '2027-05-01',
    availableTo: '2027-08-15',
    availabilityNotes: null,
    listingType: 'ROOM',
    leaseType: 'SUBLET',
    address: null,
    neighborhood: 'Central Campus',
    city: null,
    state: null,
    zipCode: null,
    buildingName: null,
    floorPlanName: null,
    campusArea: 'CENTRAL_CAMPUS',
    campusProximityNotes: null,
    bedrooms: 1,
    bathrooms: 1,
    furnished: true,
    roommates: null,
    roommateNotes: null,
    amenities: [],
    buildingAmenities: [],
    unitAmenities: [],
    petPolicy: null,
    parking: null,
    laundry: null,
    airConditioning: null,
    photos: [],
    sourceAttribution: {
      fieldsFromPersonalSubletSource: [],
      fieldsFromBuildingSource: [],
      fieldsGeneratedByAI: [],
      fieldsNeedingUserConfirmation: [],
    },
    conflictsBetweenSources: [],
    contactInfoFoundInOriginalPost: { name: null, phone: null, email: null, socialHandle: null },
    generatedMarketingCopy: { shortTitle: null, polishedDescription: null, highlights: [] },
    missingFields: [],
    uncertaintyNotes: [],
    confidence: { overall: 0.5, rent: null, dates: null, location: null, photos: null, buildingEnrichment: null },
    safetyFlags: {
      mayContainPersonalInfo: false,
      suspiciousOrScamLike: false,
      duplicateOrRepostRisk: false,
      unclearOwnership: false,
      copyrightedBuildingMarketingContentRisk: false,
      buildingPhotosPermissionUnclear: false,
    },
    ...over,
  }
}

// ── claim tokens ──
test('claim token: hash is deterministic and not the raw token', () => {
  const raw = generateClaimToken()
  assert.notEqual(raw, hashClaimToken(raw))
  assert.equal(hashClaimToken(raw), hashClaimToken(raw))
  assert.equal(hashClaimToken(raw).length, 64) // sha256 hex
})

test('claim token: distinct tokens hash differently', () => {
  assert.notEqual(hashClaimToken(generateClaimToken()), hashClaimToken(generateClaimToken()))
})

test('claim token: expiry detection', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const exp = claimTokenExpiry(now)
  assert.equal(isClaimTokenExpired(exp, now), false)
  const past = new Date('2025-01-01T00:00:00Z')
  assert.equal(isClaimTokenExpired(past, now), true)
  assert.equal(isClaimTokenExpired(null, now), true)
})

// ── normalize ──
test('normalize: empty strings → null, amenities deduped + unioned', () => {
  const out = normalizeExtractedListing(
    draft({
      title: '  ',
      neighborhood: '  Kerrytown ',
      unitAmenities: ['In-unit laundry', 'in-unit laundry '],
      buildingAmenities: ['Gym', 'Study rooms'],
      amenities: ['Gym'],
    }),
  )
  assert.equal(out.title, null)
  assert.equal(out.neighborhood, 'Kerrytown')
  assert.deepEqual(out.unitAmenities, ['In-unit laundry'])
  // union of loose + unit + building, deduped case-insensitively
  assert.deepEqual(out.amenities.sort(), ['Gym', 'In-unit laundry', 'Study rooms'])
})

test('normalize: clamps confidence to 0..1', () => {
  const out = normalizeExtractedListing(
    draft({ confidence: { overall: 5, rent: -2, dates: null, location: 0.4, photos: null, buildingEnrichment: null } }),
  )
  assert.equal(out.confidence.overall, 1)
  assert.equal(out.confidence.rent, 0)
  assert.equal(out.confidence.location, 0.4)
})

test('normalize: defaults city/state to Ann Arbor/MI only with a local signal', () => {
  const withSignal = normalizeExtractedListing(draft({ city: null, state: null, neighborhood: 'Burns Park' }))
  assert.equal(withSignal.city, 'Ann Arbor')
  assert.equal(withSignal.state, 'MI')

  const noSignal = normalizeExtractedListing(
    draft({ city: null, state: null, neighborhood: null, address: null, campusArea: 'UNKNOWN', buildingName: null }),
  )
  assert.equal(noSignal.city, null)
  assert.equal(noSignal.state, null)
})

// ── conflicts ──
test('detectSourceConflicts: flags mismatch, resolves to personal', () => {
  const conflicts = detectSourceConflicts(
    { rentMonthly: 1200, bedrooms: 1 },
    { rentMonthly: 1800, bedrooms: 1 },
  )
  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].field, 'rentMonthly')
  assert.equal(conflicts[0].resolution, 'USED_PERSONAL_SOURCE')
})

test('detectSourceConflicts: no conflict when a side is null', () => {
  assert.equal(detectSourceConflicts({ rentMonthly: 1200 }, { rentMonthly: null }).length, 0)
})

// ── source attribution ──
test('mapSourceAttribution: needs-confirmation overrides other labels', () => {
  const map = mapSourceAttribution({
    fieldsFromPersonalSubletSource: ['rentMonthly'],
    fieldsFromBuildingSource: ['buildingAmenities'],
    fieldsGeneratedByAI: ['description'],
    fieldsNeedingUserConfirmation: ['buildingAmenities'],
  })
  assert.equal(map.rentMonthly, 'PERSONAL')
  assert.equal(map.description, 'AI')
  assert.equal(map.buildingAmenities, 'NEEDS_CONFIRMATION')
})

// ── publish validation ──
test('publish: complete draft + confirmations passes', () => {
  const r = validatePublishRequirements(draft(), {
    ownerUserId: 'u1',
    userConfirmedAccuracy: true,
    enrichmentUsed: false,
    userConfirmedEnrichment: false,
    confirmedPhotoCount: 1,
  })
  assert.equal(r.ok, true)
  assert.deepEqual(r.missing, [])
})

test('publish: missing rent, photo, accuracy confirmation are reported', () => {
  const r = validatePublishRequirements(draft({ rentMonthly: null }), {
    ownerUserId: 'u1',
    userConfirmedAccuracy: false,
    enrichmentUsed: false,
    userConfirmedEnrichment: false,
    confirmedPhotoCount: 0,
  })
  assert.equal(r.ok, false)
  assert.ok(r.missing.some(m => /rent/i.test(m)))
  assert.ok(r.missing.some(m => /photo/i.test(m)))
  assert.ok(r.missing.some(m => /accurate/i.test(m)))
})

test('publish: enrichment requires its own confirmation', () => {
  const r = validatePublishRequirements(draft(), {
    ownerUserId: 'u1',
    userConfirmedAccuracy: true,
    enrichmentUsed: true,
    userConfirmedEnrichment: false,
    confirmedPhotoCount: 1,
  })
  assert.equal(r.ok, false)
  assert.ok(r.missing.some(m => /building\/floor-plan/i.test(m)))
})

// ── input schema ──
test('input schema: rejects missing consent', () => {
  const r = importInputSchema.safeParse({
    email: 'a@umich.edu',
    personalPastedText: 'Subletting my room, $900/mo May-Aug',
    personalImageCount: 0,
    buildingImageCount: 0,
    consentConfirmed: false,
  })
  assert.equal(r.success, false)
})

test('input schema: requires text OR images', () => {
  const r = importInputSchema.safeParse({
    email: 'a@umich.edu',
    personalImageCount: 0,
    buildingImageCount: 0,
    consentConfirmed: true,
  })
  assert.equal(r.success, false)
})

test('input schema: building content requires enrichment consent', () => {
  const r = importInputSchema.safeParse({
    email: 'a@umich.edu',
    personalPastedText: 'Room for sublet $900',
    personalImageCount: 0,
    buildingImageCount: 0,
    buildingName: 'Verve',
    consentConfirmed: true,
    buildingEnrichmentConsent: false,
  })
  assert.equal(r.success, false)
})

test('input schema: accepts a valid minimal submission', () => {
  const r = importInputSchema.safeParse({
    email: 'a@umich.edu',
    personalPastedText: 'Subletting my room, $900/mo May-Aug near Central',
    personalImageCount: 0,
    buildingImageCount: 0,
    consentConfirmed: true,
  })
  assert.equal(r.success, true)
})
