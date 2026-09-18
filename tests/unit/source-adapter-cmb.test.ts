import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error — .mjs script module, no type declarations
import { parseSubletTable } from '../../scripts/agents/sources/cmb-resident-sublets.mjs'

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
