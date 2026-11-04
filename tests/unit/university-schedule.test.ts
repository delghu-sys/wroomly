import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  COUNTRY_TZ, tzForCountry, nextLocalStart, pickSlot, planSends, groupByCountry, formatSlot, formatClock,
} from '../../src/lib/universities/schedule.ts'

const iso = (d: Date) => d.toISOString()
// Tuesday 3:00 PM in Ann Arbor (EST, UTC-5).
const NOW = new Date('2026-11-03T20:00:00Z')

test('every mapped time zone is a real one, and countries are matched however they are written', () => {
  for (const [country, tz] of Object.entries(COUNTRY_TZ)) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en-US', { timeZone: tz }), `${country} -> ${tz}`)
  }
  assert.equal(tzForCountry('Japan'), 'Asia/Tokyo')
  assert.equal(tzForCountry('  united kingdom '), 'Europe/London')
  assert.equal(tzForCountry('Hong Kong SAR, China'), 'Asia/Hong_Kong')
  assert.equal(tzForCountry('Hong Kong'), 'Asia/Hong_Kong')
  assert.equal(tzForCountry('Atlantis'), null)
  assert.equal(tzForCountry(null), null)
})

test('the next 9:00 AM in the recipient’s own zone, whatever the zone', () => {
  const at = (tz: string) => iso(nextLocalStart(NOW, tz))
  assert.equal(at('Europe/Stockholm'), '2026-11-04T08:00:00.000Z', 'Wed 9:00 CET')
  assert.equal(at('Europe/London'), '2026-11-04T09:00:00.000Z', 'Wed 9:00 GMT')
  assert.equal(at('Asia/Tokyo'), '2026-11-04T00:00:00.000Z', 'Wed 9:00 JST, already underway in Michigan time')
  assert.equal(at('Australia/Sydney'), '2026-11-03T22:00:00.000Z', 'Wed 9:00 AEDT')
  assert.equal(at('America/Sao_Paulo'), '2026-11-04T12:00:00.000Z', 'Wed 9:00 BRT')
  assert.equal(at('Asia/Kolkata'), '2026-11-04T03:30:00.000Z', 'a half-hour zone')
})

test('only Tuesday to Thursday: a Friday, weekend or Monday waits for the Tuesday', () => {
  // Friday Nov 6, 12:00 UTC.
  assert.equal(iso(nextLocalStart(new Date('2026-11-06T12:00:00Z'), 'Europe/Stockholm')), '2026-11-10T08:00:00.000Z')
  // Sunday and Monday as well.
  assert.equal(iso(nextLocalStart(new Date('2026-11-08T12:00:00Z'), 'Europe/Stockholm')), '2026-11-10T08:00:00.000Z')
  assert.equal(iso(nextLocalStart(new Date('2026-11-09T12:00:00Z'), 'Europe/Stockholm')), '2026-11-10T08:00:00.000Z')
  // Thursday morning, before 9:00 there: still that Thursday.
  assert.equal(iso(nextLocalStart(new Date('2026-11-05T06:00:00Z'), 'Europe/Stockholm')), '2026-11-05T08:00:00.000Z')
})

test('too close to 9:00, or already past it, moves on to the next allowed day', () => {
  // 08:55 in Stockholm on Wednesday: five minutes is too close.
  assert.equal(iso(nextLocalStart(new Date('2026-11-04T07:55:00Z'), 'Europe/Stockholm')), '2026-11-05T08:00:00.000Z')
  assert.equal(iso(nextLocalStart(new Date('2026-11-04T07:30:00Z'), 'Europe/Stockholm')), '2026-11-04T08:00:00.000Z', 'half an hour is fine')
})

test('daylight saving: the same wall-clock time, a different UTC time', () => {
  // Germany springs forward on Mar 28, 2027. Thursday Mar 25 is CET (UTC+1), Tuesday Mar 30 is CEST (UTC+2).
  assert.equal(iso(nextLocalStart(new Date('2027-03-24T12:00:00Z'), 'Europe/Berlin')), '2027-03-25T08:00:00.000Z')
  assert.equal(iso(nextLocalStart(new Date('2027-03-26T12:00:00Z'), 'Europe/Berlin')), '2027-03-30T07:00:00.000Z')
})

test('messages are spaced three minutes apart, in the same country and across countries', () => {
  const taken: number[] = []
  const place = (country: string) => {
    const s = pickSlot(NOW, country, taken)
    taken.push(s.at.getTime())
    return iso(s.at)
  }
  assert.equal(place('Sweden'), '2026-11-04T08:00:00.000Z')
  assert.equal(place('Sweden'), '2026-11-04T08:03:00.000Z')
  assert.equal(place('Germany'), '2026-11-04T08:06:00.000Z', 'same zone, so it queues behind them, never on the same minute')
  assert.equal(place('Japan'), '2026-11-04T00:00:00.000Z', 'a different morning, no clash')
})

test('a batch that would run past midday moves to the next allowed day', () => {
  // Sixty messages fill 9:00 to 11:57 in Stockholm; the next waits for Thursday.
  const start = Date.parse('2026-11-04T08:00:00Z')
  const taken = Array.from({ length: 60 }, (_, i) => start + i * 3 * 60_000)
  const s = pickSlot(NOW, 'Sweden', taken)
  assert.equal(iso(s.at), '2026-11-05T08:00:00.000Z')
})

test('a country with no known time zone falls back to 2:30 AM Ann Arbor time, and says so', () => {
  const s = pickSlot(NOW, 'Atlantis', [])
  assert.equal(s.fallback, true)
  assert.equal(s.tz, 'America/Detroit')
  assert.equal(iso(s.at), '2026-11-04T07:30:00.000Z')
  assert.equal(pickSlot(NOW, null, []).fallback, true)
  assert.equal(pickSlot(NOW, 'Japan', []).fallback, false)
})

test('a preview places messages the way the server will, around what is already scheduled', () => {
  const plan = planSends(NOW, [
    { id: 'a', country: 'Japan' }, { id: 'b', country: 'Japan' }, { id: 'c', country: 'Sweden' }, { id: 'd', country: null },
  ], [Date.parse('2026-11-04T00:00:00Z')])
  assert.deepEqual(plan.map(p => iso(p.slot.at)), [
    '2026-11-04T00:03:00.000Z', // Japan, behind the one already waiting at 00:00
    '2026-11-04T00:06:00.000Z',
    '2026-11-04T08:00:00.000Z',
    '2026-11-04T07:30:00.000Z',
  ])
  const groups = groupByCountry(plan)
  assert.deepEqual(groups.map(g => [g.country, g.count]), [['Japan', 2], ['Unknown country', 1], ['Sweden', 1]], 'earliest first')
  assert.equal(iso(groups[0].first), '2026-11-04T00:03:00.000Z')
  assert.equal(iso(groups[0].last), '2026-11-04T00:06:00.000Z')
})

test('times read in the recipient’s zone, with the zone named', () => {
  assert.match(formatSlot(new Date('2026-11-04T00:00:00Z'), 'Asia/Tokyo'), /^Wed, Nov 4 at 9:00 AM (GMT\+9|JST)$/)
  assert.match(formatSlot(new Date('2026-11-04T07:30:00Z')), /^Wed, Nov 4 at 2:30 AM (EST|GMT-5)$/)
  assert.equal(formatClock(new Date('2026-11-04T08:18:00Z'), 'Europe/Stockholm'), '9:18 AM')
})
