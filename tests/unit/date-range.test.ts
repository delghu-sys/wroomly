import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDateRange } from '../../src/lib/utils/listing.ts'

test('same month and year collapses to one label', () => {
  assert.equal(formatDateRange('2026-08-01', '2026-08-28'), 'Aug 2026')
})

test('same year states the year once', () => {
  assert.equal(formatDateRange('2026-05-01', '2026-08-15'), 'May – Aug 2026')
})

test('cross-year keeps both years', () => {
  assert.equal(formatDateRange('2026-08-01', '2027-08-01'), 'Aug 2026 – Aug 2027')
})

test('December to January is a cross-year range', () => {
  assert.equal(formatDateRange('2026-12-15', '2027-01-15'), 'Dec 2026 – Jan 2027')
})
