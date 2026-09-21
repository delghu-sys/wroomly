import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAvailability, parseStreetAddress } from '../../src/lib/agents/prefill.ts'

const NOW = new Date('2026-09-21T12:00:00Z')

// ── availability: the exact strings these boards print ──────────────────────

test('reads the real date strings sitting in the lead queue', () => {
  assert.deepEqual(parseAvailability('January to August 2026', NOW), {
    from: '2026-01-01',
    to: '2026-08-31',
    alreadyEnded: true,
  })
  assert.deepEqual(parseAvailability('January - August 2026', NOW), {
    from: '2026-01-01',
    to: '2026-08-31',
    alreadyEnded: true,
  })
  assert.deepEqual(parseAvailability('January-July 2026', NOW), {
    from: '2026-01-01',
    to: '2026-07-31',
    alreadyEnded: true,
  })
  assert.deepEqual(parseAvailability('January-May 2026', NOW), {
    from: '2026-01-01',
    to: '2026-05-31',
    alreadyEnded: true,
  })
})

test('a lone month and year is a START, with no end invented', () => {
  assert.deepEqual(parseAvailability('August 2025', NOW), {
    from: '2025-08-01',
    to: null,
    alreadyEnded: false,
  })
})

test('REFUSES a range with no year — "this January" or "next January" is a coin flip', () => {
  assert.equal(parseAvailability('January to August', NOW), null)
  assert.equal(parseAvailability('January to May+', NOW), null)
  assert.equal(parseAvailability('spring semester', NOW), null)
  assert.equal(parseAvailability('', NOW), null)
  assert.equal(parseAvailability(null, NOW), null)
})

test('a term crossing new year puts the START in the earlier year', () => {
  // "September to May 2027" is one academic year, not eight months backwards.
  assert.deepEqual(parseAvailability('September to May 2027', NOW), {
    from: '2026-09-01',
    to: '2027-05-31',
    alreadyEnded: false,
  })
})

test('a year on each side is taken literally', () => {
  assert.deepEqual(parseAvailability('Aug 2026 to May 2027', NOW), {
    from: '2026-08-01',
    to: '2027-05-31',
    alreadyEnded: false,
  })
})

test('abbreviations, dash styles and casing all read the same', () => {
  const expected = { from: '2027-01-01', to: '2027-05-31', alreadyEnded: false }
  for (const s of [
    'Jan to May 2027',
    'JANUARY – MAY 2027',
    'jan—may 2027',
    'January through May 2027',
    'Jan until May 2027',
  ]) {
    assert.deepEqual(parseAvailability(s, NOW), expected, `failed on ${s}`)
  }
})

test('end-of-month is the real last day, not a fixed 30', () => {
  assert.equal(parseAvailability('Jan to Feb 2027', NOW)?.to, '2027-02-28')
  assert.equal(parseAvailability('Jan to Feb 2028', NOW)?.to, '2028-02-29', 'leap year')
})

test('a past term is flagged rather than quietly prefilled as if current', () => {
  assert.equal(parseAvailability('January to August 2026', NOW)?.alreadyEnded, true)
  assert.equal(parseAvailability('January to August 2027', NOW)?.alreadyEnded, false)
})

test('dates are calendar dates — the 1st never slips to the previous month', () => {
  // Built in UTC: local-time construction breaks this for anyone behind UTC.
  assert.equal(parseAvailability('March 2027', NOW)?.from, '2027-03-01')
})

// ── street address ──────────────────────────────────────────────────────────

test('reads the real titles in the queue, which ARE addresses', () => {
  assert.deepEqual(parseStreetAddress('721 S Forest Ave'), { address: '721 S Forest Ave', zipCode: null })
  assert.deepEqual(parseStreetAddress('333 S Division St'), { address: '333 S Division St', zipCode: null })
  assert.deepEqual(parseStreetAddress('848 Tappan Avenue'), { address: '848 Tappan Avenue', zipCode: null })
  assert.deepEqual(parseStreetAddress('327 S. Division'), { address: '327 S. Division', zipCode: null })
})

test('strips a trailing city/state and keeps a full ZIP', () => {
  assert.deepEqual(parseStreetAddress('611 E University Ave, Ann Arbor, MI 48104'), {
    address: '611 E University Ave',
    zipCode: '48104',
  })
})

test('a TRUNCATED zip is dropped, not stored — one real title arrives cut off', () => {
  assert.deepEqual(parseStreetAddress('611 E University Ave, Ann Arbor, MI 4810'), {
    address: '611 E University Ave',
    zipCode: null,
  })
})

test('REFUSES anything without a house number — half an address locates nothing', () => {
  assert.equal(parseStreetAddress('Sublet near U-M'), null)
  assert.equal(parseStreetAddress('Cozy room in Kerrytown'), null)
  assert.equal(parseStreetAddress('Tappan Avenue'), null)
  assert.equal(parseStreetAddress('123'), null, 'a bare number is not an address')
  assert.equal(parseStreetAddress(''), null)
  assert.equal(parseStreetAddress(null), null)
})

test('a title that starts with a COUNT is not mistaken for a house number', () => {
  assert.equal(parseStreetAddress('2 bed apartment on State'), null)
  assert.equal(parseStreetAddress('1 bedroom sublet'), null)
  assert.equal(parseStreetAddress('4 Bath house near campus'), null)
})

test('keeps a unit suffix and normalizes whitespace', () => {
  assert.equal(parseStreetAddress('  721   S Forest Ave  Apt 3B ')?.address, '721 S Forest Ave Apt 3B')
  assert.equal(parseStreetAddress('1300A Packard St')?.address, '1300A Packard St')
})
