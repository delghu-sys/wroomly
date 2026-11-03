import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextSendStart, planStart, slotAt, formatSlot } from '../../src/lib/universities/schedule.ts'

const iso = (d: Date) => d.toISOString()

test('the next 2:30 AM Ann Arbor time, in winter (EST, UTC-5)', () => {
  // 3 PM EST on Nov 3 → 2:30 AM EST on Nov 4.
  assert.equal(iso(nextSendStart(new Date('2026-11-03T20:00:00Z'))), '2026-11-04T07:30:00.000Z')
  // Just after midnight the same night still means later that night.
  assert.equal(iso(nextSendStart(new Date('2026-11-04T05:30:00Z'))), '2026-11-04T07:30:00.000Z')
})

test('too close to 2:30, or already past it, rolls to the next night', () => {
  assert.equal(iso(nextSendStart(new Date('2026-11-04T07:25:00Z'))), '2026-11-05T07:30:00.000Z', 'five minutes away is too close for a scheduled send')
  assert.equal(iso(nextSendStart(new Date('2026-11-04T07:31:00Z'))), '2026-11-05T07:30:00.000Z')
  assert.equal(iso(nextSendStart(new Date('2026-11-04T07:10:00Z'))), '2026-11-04T07:30:00.000Z', 'twenty minutes away is fine')
})

test('daylight saving: the same wall-clock time, a different UTC time', () => {
  // EDT is UTC-4: 2:30 AM on Jun 2 is 06:30 UTC.
  assert.equal(iso(nextSendStart(new Date('2026-06-01T20:00:00Z'))), '2026-06-02T06:30:00.000Z')
  // The night the clocks go back (Nov 1, 2026): 2:30 AM happens twice; either is a night-time send.
  const d = nextSendStart(new Date('2026-10-31T20:00:00Z')).getTime()
  assert.ok(d >= Date.parse('2026-11-01T06:30:00Z') && d <= Date.parse('2026-11-01T07:30:00Z'))
  // The night the clocks go forward (Mar 14, 2027): 2:30 AM does not exist; still lands in the small hours.
  const s = nextSendStart(new Date('2027-03-13T20:00:00Z')).getTime()
  assert.ok(s >= Date.parse('2027-03-14T06:30:00Z') && s <= Date.parse('2027-03-14T07:30:00Z'))
})

test('month and year ends roll over correctly', () => {
  assert.equal(iso(nextSendStart(new Date('2026-12-31T20:00:00Z'))), '2027-01-01T07:30:00.000Z')
})

test('a batch queues after anything already scheduled, three minutes apart', () => {
  const now = new Date('2026-11-03T20:00:00Z')
  assert.equal(iso(planStart(now, null)), '2026-11-04T07:30:00.000Z')
  assert.equal(iso(planStart(now, new Date('2026-11-04T07:42:00Z'))), '2026-11-04T07:45:00.000Z')
  assert.equal(iso(planStart(now, new Date('2026-11-04T07:00:00Z'))), '2026-11-04T07:30:00.000Z', 'an earlier one does not push the start earlier')
  assert.equal(iso(slotAt(new Date('2026-11-04T07:30:00Z'), 4)), '2026-11-04T07:42:00.000Z')
})

test('slot text is in Ann Arbor time with the zone named', () => {
  assert.match(formatSlot(new Date('2026-11-04T07:30:00Z')), /^Wed, Nov 4 at 2:30 AM (EST|GMT-5)$/)
  assert.match(formatSlot(new Date('2026-06-02T06:30:00Z')), /^Tue, Jun 2 at 2:30 AM (EDT|GMT-4)$/)
})
