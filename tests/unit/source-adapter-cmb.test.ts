import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSubletTable } from '../../src/lib/agents/sources/cmb-resident-sublets.ts'

// Fixture mirrors the real board's column layout (Name, Email/Phone, Property,
// Dates, Type, Price, Notes) with INVENTED people, so the suite never handles a
// real resident's contact details.
const fixture = `
<table>
  <tr><th>Name</th><th>Email/Phone</th><th>Property</th><th>Dates Available</th><th>Type</th><th>Price</th><th>Notes</th></tr>
  <tr><td>Ada</td><td>ada@example.com</td><td>Broadview Apartments</td><td>1/20/2027-8/24/2027</td><td>2 Bed 1.5 Bath</td><td>1900</td><td></td></tr>
  <tr><td>Grace</td><td>734 555-0100</td><td>Eastwind</td><td>9/1-8/13/27</td><td>1b1b</td><td>$1550</td><td>Rent is O.B.O</td></tr>
  <tr><td>Alan</td><td>leasing@annarborapartments.net</td><td>820 McKinley</td><td>9/1-8/13/27</td><td>1bed</td><td>1800</td><td></td></tr>
  <tr><td>Katherine</td><td>kat@example.com</td><td>Maple Court</td><td>5/1-8/20/27</td><td>Studio</td><td>1200</td><td>Fully leased</td></tr>
</table>`

test('parses one lead per resident post', () => {
  const leads = parseSubletTable(fixture)
  // Katherine's row says "Fully leased" and must be dropped.
  assert.deepEqual(leads.map((l: { extracted: { posterName: string } }) => l.extracted.posterName), ['Ada', 'Grace', 'Alan'])
})

test('takes a personal email as an invitation to contact', () => {
  const ada = parseSubletTable(fixture)[0]
  assert.equal(ada.contactEmail, 'ada@example.com')
  assert.equal(ada.title, '2 Bed 1.5 Bath at Broadview Apartments')
})

test('a phone-only row yields NO contact — that resident routed enquiries through the office', () => {
  const grace = parseSubletTable(fixture)[1]
  assert.equal(grace.contactEmail, undefined, 'must not invent a contact')
})

test('the leasing office address is NOT treated as a resident contact', () => {
  const alan = parseSubletTable(fixture)[2]
  assert.equal(alan.contactEmail, undefined, 'management is not the person who posted')
})

test('ids are stable across runs, so nobody is discovered — or contacted — twice', () => {
  const a = parseSubletTable(fixture).map((l: { sourceExternalId: string }) => l.sourceExternalId)
  const b = parseSubletTable(fixture).map((l: { sourceExternalId: string }) => l.sourceExternalId)
  assert.deepEqual(a, b)
  assert.equal(new Set(a).size, a.length, 'ids must be unique within a run')
})

test('never returns image data — we link to the post, we do not copy it', () => {
  for (const l of parseSubletTable(fixture)) {
    const keys = Object.keys(l.extracted).join(' ') + Object.keys(l).join(' ')
    assert.ok(!/image|photo|img/i.test(keys), 'adapters must not carry photos')
  }
})

test('an empty or table-less page yields nothing rather than throwing', () => {
  assert.deepEqual(parseSubletTable(''), [])
  assert.deepEqual(parseSubletTable('<p>no table here</p>'), [])
})

// ── sanitizeLeads drops expired terms ──────────────────────────────────────

import { sanitizeLeads } from '../../src/lib/agents/source-adapter.ts'

const AT = new Date('2026-09-21T12:00:00Z')
const lead = (id: string, dates: string | null) => ({
  sourceExternalId: id,
  title: `${id} St`,
  contactEmail: 'poster@example.com',
  extracted: dates === null ? {} : { dates },
})

test('an expired listing never enters the queue, and says why', () => {
  const { ok, rejected } = sanitizeLeads([lead('100', 'January to August 2026')], { now: AT })
  assert.equal(ok.length, 0)
  assert.equal(rejected.length, 1)
  assert.match(rejected[0].reason, /term already ended/)
  assert.match(rejected[0].reason, /January to August 2026/, 'the console shows the original text')
})

test('current, upcoming and undateable listings all pass through', () => {
  const { ok, rejected } = sanitizeLeads(
    [
      lead('200', 'September 2026 to May 2027'),
      lead('300', 'January to August 2027'),
      lead('400', 'January to August'),
      lead('500', null),
    ],
    { now: AT },
  )
  assert.deepEqual(ok.map(l => l.sourceExternalId), ['200', '300', '400', '500'])
  assert.deepEqual(rejected, [])
})

test('the expiry check does not disturb the existing rejections', () => {
  const { ok, rejected } = sanitizeLeads(
    [
      { sourceExternalId: '', title: 'no id' },
      lead('600', 'January to August 2027'),
      lead('600', 'January to August 2027'),
      { sourceExternalId: '700', contactEmail: 'not-an-email' },
    ],
    { now: AT },
  )
  assert.deepEqual(ok.map(l => l.sourceExternalId), ['600'])
  assert.deepEqual(rejected.map(r => r.reason), [
    'missing sourceExternalId',
    'duplicate sourceExternalId',
    'malformed contactEmail',
  ])
})
