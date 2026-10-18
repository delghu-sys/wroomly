import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toLeadTableRow,
  filterLeads,
  sortLeads,
  leadsToCsv,
  EMPTY_FILTERS,
  type LeadDbRow,
} from '../../src/lib/agents/leads-table.ts'

const NOW = new Date('2026-10-18T12:00:00Z')

const db = (over: Partial<LeadDbRow> & { id: string }): LeadDbRow => ({
  status: 'new',
  skip_reason: null,
  title: 'A Sublet',
  contact_email: null,
  source: 'offcampus-universe-umich',
  source_url: 'https://example.com/post',
  discovered_at: '2026-10-10T08:00:00Z',
  outreach_sent_at: null,
  import_request_id: null,
  extracted: {},
  ...over,
})

const rows = [
  toLeadTableRow(db({ id: 'a', title: '721 S Forest', contact_email: 'ada@example.com', status: 'contacted', outreach_sent_at: '2026-10-12T09:00:00Z', import_request_id: 'req-a', extracted: { price: '$1,200', dates: 'January to April 2027', postedAt: '2026-10-01T00:00:00Z', contactName: 'Ada' } }), NOW),
  toLeadTableRow(db({ id: 'b', title: '[Sublease] Beekman', source: 'reddit-sublets', extracted: { price: '$2,200', dates: 'Jan-May 2027', postedAt: '2026-10-09T00:00:00Z', contactHandle: 'u/ada_l', contactUrl: 'https://www.reddit.com/user/ada_l', posterName: 'u/ada_l' } }), NOW),
  toLeadTableRow(db({ id: 'c', title: 'Eastwind 1b1b', source: 'cmb-resident-sublets', status: 'skipped', skip_reason: 'term already ended ("5/1-8/20/26")', extracted: { price: '$950', dates: '5/1/26-8/20/26' } }), NOW),
  toLeadTableRow(db({ id: 'd', title: 'Undated room', extracted: {} }), NOW),
]

test('a db row becomes a table row with contact kind, term state and sortable price', () => {
  const [a, b, c, d] = rows
  assert.equal(a.contactKind, 'email')
  assert.equal(a.termState, 'current')
  assert.equal(a.priceNumber, 1200)
  assert.equal(a.postedOn, '2026-10-01')
  assert.equal(a.emailedOn, '2026-10-12')
  assert.equal(a.draftId, 'a', 'the title links to the draft page by lead id')
  assert.equal(a.contactName, 'Ada')

  assert.equal(b.contactKind, 'handle')
  assert.equal(b.contactHandle, 'u/ada_l')
  assert.equal(b.contactEmail, null)
  assert.equal(b.termState, 'current')

  assert.equal(c.contactKind, 'none')
  assert.equal(c.termState, 'ended')
  assert.equal(c.draftId, null)

  assert.equal(d.termState, 'unknown')
  assert.equal(d.priceNumber, null)
  assert.equal(d.foundOn, '2026-10-10')
})

test('filters: each one narrows, and they combine', () => {
  const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterLeads(rows, { ...EMPTY_FILTERS, ...f }).map(r => r.id)
  assert.deepEqual(ids({}), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids({ source: 'reddit-sublets' }), ['b'])
  assert.deepEqual(ids({ status: 'skipped' }), ['c'])
  assert.deepEqual(ids({ contact: 'email' }), ['a'])
  assert.deepEqual(ids({ contact: 'handle' }), ['b'])
  assert.deepEqual(ids({ contact: 'none' }), ['c', 'd'])
  assert.deepEqual(ids({ emailed: 'yes' }), ['a'])
  assert.deepEqual(ids({ emailed: 'no' }), ['b', 'c', 'd'])
  assert.deepEqual(ids({ term: 'ended' }), ['c'])
  assert.deepEqual(ids({ term: 'current', emailed: 'no' }), ['b'], 'current AND not yet emailed')
})

test('search is case-insensitive and looks at contact, name, dates, price and reason too', () => {
  const ids = (search: string) => filterLeads(rows, { ...EMPTY_FILTERS, search }).map(r => r.id)
  assert.deepEqual(ids('FOREST'), ['a'])
  assert.deepEqual(ids('ada@'), ['a'])
  assert.deepEqual(ids('u/ada'), ['b'])
  assert.deepEqual(ids('already ended'), ['c'])
  assert.deepEqual(ids('2027'), ['a', 'b'])
  assert.deepEqual(ids('$2,2'), ['b'])
  assert.deepEqual(ids('nothing like this'), [])
})

test('sorting: by price, blanks always last; by date; by status order; stable', () => {
  assert.deepEqual(sortLeads(rows, 'price', 'asc').map(r => r.id), ['c', 'a', 'b', 'd'])
  assert.deepEqual(sortLeads(rows, 'price', 'desc').map(r => r.id), ['b', 'a', 'c', 'd'], 'no price is not "cheapest"')
  assert.deepEqual(sortLeads(rows, 'postedOn', 'desc').map(r => r.id), ['b', 'a', 'c', 'd'])
  assert.deepEqual(sortLeads(rows, 'status', 'asc').map(r => r.id), ['b', 'd', 'a', 'c'], 'new → drafted → contacted → skipped, ties keep input order')
  assert.deepEqual(sortLeads(rows, 'contact', 'asc').map(r => r.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(rows.map(r => r.id), ['a', 'b', 'c', 'd'], 'the input is not mutated')
})

test('CSV: header + one line per row, quoting commas and quotes, neutralising formulas', () => {
  const csv = leadsToCsv([
    rows[0],
    toLeadTableRow(db({ id: 'e', title: 'Room, "cozy"', extracted: { price: '=HYPERLINK("x")' } }), NOW),
  ])
  const lines = csv.split('\r\n')
  assert.equal(lines[0], 'status,listing,price,dates,term,contact_email,contact_handle,contact_name,source,source_url,board_status,posted_on,found_on,emailed_on,skip_reason')
  assert.equal(lines[1], 'contacted,721 S Forest,"$1,200",January to April 2027,current,ada@example.com,,Ada,offcampus-universe-umich,https://example.com/post,,2026-10-01,2026-10-10,2026-10-12,')
  assert.match(lines[2], /^new,"Room, ""cozy""",/)
  assert.match(lines[2], /'=HYPERLINK/, 'a cell starting with = must not run as a formula in Excel')
  assert.equal(lines.at(-1), '', 'ends with a newline')
})
