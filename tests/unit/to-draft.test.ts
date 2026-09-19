import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leadToExtractedDraft } from '../../src/lib/agents/to-draft.ts'

// leadToExtractedDraft is what makes an agent-sourced draft render on the
// claim page at all. A bug here isn't cosmetic — it's the difference between
// a real person seeing their listing and seeing "This link isn't valid" or a
// runtime crash. See ClaimReview.tsx, which calls `.filter()` on `photos`
// unconditionally.

const base = {
  title: 'Test Sublet',
  sourceLabel: 'Test Source',
  contactEmail: 'poster@example.com',
  extracted: {},
}

test('photos is always a real array, never undefined', () => {
  // ClaimReview does initial.photos.filter(...) with no guard. If this were
  // ever undefined the claim page would throw for every agent-sourced draft.
  const d = leadToExtractedDraft(base)
  assert.ok(Array.isArray(d.photos))
  assert.equal(d.photos.length, 0)
})

test('every array/object field required by the type is present', () => {
  const d = leadToExtractedDraft(base)
  assert.ok(Array.isArray(d.amenities))
  assert.ok(Array.isArray(d.buildingAmenities))
  assert.ok(Array.isArray(d.unitAmenities))
  assert.ok(Array.isArray(d.missingFields))
  assert.ok(Array.isArray(d.uncertaintyNotes))
  assert.ok(Array.isArray(d.conflictsBetweenSources))
  assert.ok(Array.isArray(d.sourceAttribution.fieldsFromPersonalSubletSource))
  assert.ok(d.confidence)
  assert.ok(d.safetyFlags)
  assert.ok(d.contactInfoFoundInOriginalPost)
  assert.ok(d.generatedMarketingCopy)
})

test('never fabricates a description', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { notes: 'great place' } })
  assert.equal(d.description, null)
})

test('strips currency symbols and thousands separators from price', () => {
  assert.equal(leadToExtractedDraft({ ...base, extracted: { price: '$1,900' } }).rentMonthly, 1900)
  assert.equal(leadToExtractedDraft({ ...base, extracted: { price: '1650' } }).rentMonthly, 1650)
})

test('a missing or unparseable price yields null, not zero or NaN', () => {
  assert.equal(leadToExtractedDraft({ ...base, extracted: {} }).rentMonthly, null)
  assert.equal(leadToExtractedDraft({ ...base, extracted: { price: 'ask' } }).rentMonthly, null)
  assert.equal(leadToExtractedDraft({ ...base, extracted: { price: '0' } }).rentMonthly, null, '$0 rent is not real data')
})

test('does NOT guess exact dates from a free-text range — puts it in availabilityNotes instead', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { dates: 'January - May' } })
  assert.equal(d.availableFrom, null)
  assert.equal(d.availableTo, null)
  assert.equal(d.availabilityNotes, 'January - May')
  assert.ok(d.missingFields.includes('availableFrom'))
  assert.ok(d.missingFields.includes('availableTo'))
})

test('bedrooms/bathrooms parse when numeric, stay null and land in missingFields otherwise', () => {
  const withCounts = leadToExtractedDraft({ ...base, extracted: { bedrooms: '3', bathrooms: '1.5' } })
  assert.equal(withCounts.bedrooms, 3)
  assert.equal(withCounts.bathrooms, 1.5)
  assert.equal(withCounts.missingFields.includes('bedrooms'), false)

  const without = leadToExtractedDraft({ ...base, extracted: { unitType: '2 Bed 1.5 Bath' } })
  assert.equal(without.bedrooms, null, 'free-text unit type is not parsed as a number')
  assert.ok(without.missingFields.includes('bedrooms'))
  assert.ok(without.uncertaintyNotes.some(n => n.includes('2 Bed 1.5 Bath')), 'preserved as a note instead of lost')
})

test('the contact email always lands on contactInfoFoundInOriginalPost, and only there', () => {
  const d = leadToExtractedDraft({ ...base, contactEmail: 'poster@example.com' })
  assert.equal(d.contactInfoFoundInOriginalPost.email, 'poster@example.com')
})

test('poster name: CMB uses posterName, Off Campus Universe uses contactName', () => {
  assert.equal(leadToExtractedDraft({ ...base, extracted: { posterName: 'Ada' } }).contactInfoFoundInOriginalPost.name, 'Ada')
  assert.equal(leadToExtractedDraft({ ...base, extracted: { contactName: 'Grace' } }).contactInfoFoundInOriginalPost.name, 'Grace')
})

test('always Ann Arbor / MI, and leaseType SUBLET (both registered sources are sublet-only)', () => {
  const d = leadToExtractedDraft(base)
  assert.equal(d.city, 'Ann Arbor')
  assert.equal(d.state, 'MI')
  assert.equal(d.leaseType, 'SUBLET')
})

test('confidence stays low and no safety flag is ever claimed true without signal', () => {
  const d = leadToExtractedDraft(base)
  assert.ok(d.confidence.overall < 0.5, 'must read as "needs review", not "done"')
  for (const v of Object.values(d.safetyFlags)) assert.equal(v, false)
})

test('a non-Student poster on Off Campus Universe is flagged, not hidden', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { posterType: 'Property Manager' } })
  assert.ok(d.uncertaintyNotes.some(n => n.includes('Property Manager')))
})

test('missing title becomes null, not an empty string', () => {
  assert.equal(leadToExtractedDraft({ ...base, title: null }).title, null)
  assert.equal(leadToExtractedDraft({ ...base, title: '  ' }).title, null)
})
