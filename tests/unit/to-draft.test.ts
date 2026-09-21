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

// NOTE: "January - May" carries NO YEAR, which is the case that stays
// unparsed on purpose. A dated range IS now read — see the prefill tests
// below and prefill.ts.
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

// ── prefill: reading what the post plainly said ─────────────────────────────
//
// The outreach email promises "we've pre-filled a draft so you don't have to
// retype it". Leaving the address and dates blank when the post stated both
// made that close to untrue, and left the claimer facing the two most
// tedious fields in the form.

test('a DATED range is read into real dates and leaves missingFields', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { dates: 'January to August 2026' } })
  assert.equal(d.availableFrom, '2026-01-01')
  assert.equal(d.availableTo, '2026-08-31')
  assert.ok(!d.missingFields.includes('availableFrom'))
  assert.ok(!d.missingFields.includes('availableTo'))
  // Attribution must say where these came from, or the claim page shows a
  // date with no indication it was read off someone's post.
  const attributed = d.sourceAttribution.fieldsFromPersonalSubletSource
  assert.ok(attributed.includes('availableFrom'))
  assert.ok(attributed.includes('availableTo'))
})

test('the raw text survives even once parsed, so the person can compare', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { dates: 'January to August 2026' } })
  assert.equal(d.availabilityNotes, 'January to August 2026')
  assert.ok(
    d.uncertaintyNotes.some(n => n.includes('January to August 2026')),
    'the note quotes the original wording',
  )
})

test('a term that has already ended says so, loudly', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { dates: 'January to August 2020' } })
  assert.ok(d.uncertaintyNotes.some(n => n.includes('already passed')))
})

test('an address title is read into address — but NEVER into coordinates', () => {
  const d = leadToExtractedDraft({ ...base, title: '721 S Forest Ave' })
  assert.equal(d.address, '721 S Forest Ave')
  assert.equal(d.lat, null, 'publish-validation requires real coordinates; we must not fake them')
  assert.equal(d.lng, null)
  assert.ok(!d.missingFields.includes('address'))
  assert.ok(d.sourceAttribution.fieldsFromPersonalSubletSource.includes('address'))
  assert.ok(
    d.uncertaintyNotes.some(n => n.includes('suggestions')),
    'the person is told they still have to place it on the map',
  )
})

test('a full ZIP in the title is kept; city and state stay as the fixed values', () => {
  const d = leadToExtractedDraft({ ...base, title: '611 E University Ave, Ann Arbor, MI 48104' })
  assert.equal(d.address, '611 E University Ave')
  assert.equal(d.zipCode, '48104')
  assert.equal(d.city, 'Ann Arbor')
  assert.equal(d.state, 'MI')
})

test('a marketing title yields NO address and still asks for one', () => {
  const d = leadToExtractedDraft({ ...base, title: 'Cozy sublet near campus' })
  assert.equal(d.address, null)
  assert.equal(d.zipCode, null)
  assert.ok(d.missingFields.includes('address'))
})

test('description is still never fabricated, prefill or not', () => {
  const d = leadToExtractedDraft({
    ...base,
    title: '721 S Forest Ave',
    extracted: { dates: 'January to August 2027' },
  })
  assert.equal(d.description, null)
  assert.ok(d.missingFields.includes('description'))
})

test("the board's normalised address line wins over the title", () => {
  const d = leadToExtractedDraft({
    ...base,
    title: '327 S. Division', // free text as the poster typed it
    extracted: { addressLine: '327 S Division St', postalCode: '48104-2232' },
  })
  assert.equal(d.address, '327 S Division St')
  assert.equal(d.zipCode, '48104', 'ZIP+4 is narrowed to the 5-digit code')
  assert.equal(d.lat, null, 'coordinates are still never taken from a scrape')
  assert.equal(d.lng, null)
})

test('a record without the address line falls back to reading the title', () => {
  const d = leadToExtractedDraft({ ...base, title: '611 E University Ave, Ann Arbor, MI 48104' })
  assert.equal(d.address, '611 E University Ave')
  assert.equal(d.zipCode, '48104')
})

test('a plain 5-digit postal code is taken as-is', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { addressLine: '333 S Division St', postalCode: '48104' } })
  assert.equal(d.zipCode, '48104')
})

test('a malformed postal code is dropped rather than stored', () => {
  const d = leadToExtractedDraft({ ...base, extracted: { addressLine: '333 S Division St', postalCode: '4810' } })
  assert.equal(d.zipCode, null)
})

test('an unusable address line still falls back to the title', () => {
  const d = leadToExtractedDraft({ ...base, title: '721 S Forest Ave', extracted: { addressLine: 'Ann Arbor' } })
  assert.equal(d.address, '721 S Forest Ave', 'no house number in the line, so the title is used')
})
