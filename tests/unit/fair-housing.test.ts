import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkFairHousing } from '../../src/lib/fairHousing.ts'

// The two required-to-fire and one required-to-stay-quiet cases come from the
// legal implementation package's acceptance checklist, verbatim.
test('flags "no kids"', () => {
  assert.ok(checkFairHousing('Nice place but no kids'))
})

test('flags "female only"', () => {
  assert.equal(checkFairHousing('female only please')?.phrase, 'female only')
})

test('does NOT flag a plain property description', () => {
  assert.equal(checkFairHousing('2 bed, 1 bath, $900/month, May-August'), null)
})

test('does NOT flag legitimate property context ("near the Catholic church")', () => {
  assert.equal(checkFairHousing('Sunny room near the Catholic church'), null)
})

test('flags source-of-income exclusion (Michigan/Ann Arbor protected class)', () => {
  assert.equal(checkFairHousing('No Section 8 tenants')?.phrase, 'no section 8')
})

test('word boundaries: "great for students" is clean, "students only" is not', () => {
  assert.equal(checkFairHousing('great for students'), null)
  assert.ok(checkFairHousing('students only'))
})

test('case-insensitive and flexible whitespace', () => {
  assert.ok(checkFairHousing('FEMALE   ONLY'))
})

test('empty and null-ish input is clean', () => {
  assert.equal(checkFairHousing(''), null)
})
