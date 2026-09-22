import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  umichListingUrls,
  parseListingFacts,
  isSublet,
  toLead,
  extractContact,
} from '../../src/lib/agents/sources/offcampus-universe.ts'
import { sanitizeLeads as sanitizeLeadsOcu } from '../../src/lib/agents/source-adapter.ts'

// Fixtures mirror the real page shapes (checked 2026-09-18) with INVENTED
// listings, so the suite never handles a real poster's details.

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/verve-3-bed-sublease-d26043ee-42e1-49db-b907-28c21d52a006</loc></url>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/922-s-state-street-unit-1-700-ada-lovelace</loc></url>
  <url><loc>https://www.offcampus-universe.com/university/university-of-arizona/apartment-listings/tucson-place-1234</loc></url>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/verve-3-bed-sublease-d26043ee-42e1-49db-b907-28c21d52a006</loc></url>
</urlset>`

const page = (title: string, desc: string) =>
  `<html><head><title>${title} | Ann Arbor Universe Housing</title>` +
  `<meta name="description" content="${desc}"/></head><body>…</body></html>`

test('sitemap yields only U-M listings, de-duplicated', () => {
  const urls = umichListingUrls(sitemap)
  assert.equal(urls.length, 2, 'the Arizona listing and the repeat must be dropped')
  assert.ok(urls.every(u => u.url.includes('/university-of-michigan/')))
})

test('the id is the slug — half the real slugs have no trailing UUID', () => {
  const [withUuid, withName] = umichListingUrls(sitemap)
  assert.equal(withUuid.id, 'verve-3-bed-sublease-d26043ee-42e1-49db-b907-28c21d52a006')
  // Real example: slugs that end in the poster's name instead of an id.
  assert.equal(withName.id, '922-s-state-street-unit-1-700-ada-lovelace')
})

test('facts come from the page’s own title and meta description', () => {
  const f = parseListingFacts(page('Verve 3 Bed/4 Bath Sublease', 'Sub Lease apartment at Verve 3 Bed/4 Bath Sublease, listed at $1,650  on Ann Arbor Universe Housing'))
  assert.equal(f.title, 'Verve 3 Bed/4 Bath Sublease')
  assert.equal(f.leaseType, 'Sub Lease')
  assert.equal(f.price, '1650', 'thousands separator stripped')
})

test('recognises sublets and rejects the other lease types on this board', () => {
  assert.equal(isSublet('Sub Lease'), true)
  assert.equal(isSublet('Sublease'), true)
  assert.equal(isSublet('Sublet'), true)
  for (const other of ['Year Lease (12 Months)', 'Biannual lease (6 months)', '1 month or longer', '', undefined]) {
    assert.equal(isSublet(other), false, `must not treat "${other}" as a sublet`)
  }
})

test('a year lease produces no CONTACTABLE lead, but is still reported', () => {
  // Was `null` until 2026-09-22. Returning nothing meant discovery never
  // recorded having looked, so it re-downloaded every year-lease listing on
  // every run — and this board is mostly year leases, which is why it never
  // got as far as anything new. It is now reported with `skip` set, rejected
  // by sanitizeLeads, and recorded so it is not fetched again.
  const html = page('Cross Street House', 'Year Lease (12 Months) apartment at Cross Street House, listed at $2,600  on Ann Arbor Universe Housing')
  const lead = toLead(html, { id: 'cross-street-house', url: 'https://example.test/x' })
  assert.ok(lead)
  assert.equal(lead.sourceExternalId, 'cross-street-house')
  assert.match(String(lead.skip), /not a sublet/)
  assert.match(String(lead.skip), /Year Lease/)
  assert.equal(lead.contactEmail, undefined, 'no contact is carried for a post we ruled out')
})

test('a sublet produces a lead with facts and a link', () => {
  const html = page('1B1B Sublease Beekman', 'Sub Lease apartment at 1B1B Sublease Beekman, listed at $1,200  on Ann Arbor Universe Housing')
  const lead = toLead(html, { id: '1b1b-sublease-beekman', url: 'https://example.test/l' })
  assert.ok(lead)
  assert.equal(lead.sourceExternalId, '1b1b-sublease-beekman')
  assert.equal(lead.sourceUrl, 'https://example.test/l')
  assert.equal(lead.title, '1B1B Sublease Beekman')
  assert.equal(lead.extracted?.price, '1200')
})

// ── contact extraction ───────────────────────────────────────────────────────
// These fixtures mirror the REAL payload shape, confirmed against a live page
// on 2026-09-18 (two earlier fixture-shapes each looked right and were wrong on
// a real page — see the comment above extractContact for what each got wrong).
// Records live at a FIXED structural location —
//   "recordsByCollectionId":{"ApartmentListings":{"<id>":{ ...record... }}}
// — which Wix populates with exactly the current page's own item (pageSize: 1
// in the page's routing config). Quotes are escaped once (\") while slashes are
// escaped twice (\\/). All people and addresses below are invented.

const esc = (o: Record<string, string>) =>
  '{' + Object.entries(o).map(([k, v]) => `\\"${k}\\":\\"${v.split('/').join('\\\\/')}\\"`).join(',') + '}'

/** A page whose CURRENT-ITEM record is `record`. `elsewhere` simulates other
 *  JSON blobs on the page (other collections, "similar listings", etc.) that
 *  must never be read — only the fixed marker location may be. */
const pageWith = (record: Record<string, string> | null, elsewhere = '') =>
  `<html><body>` +
  (record
    ? `\\"recordsByCollectionId\\":{\\"ApartmentListings\\":{\\"rec-id\\":${esc(record)}}}`
    : '') +
  elsewhere +
  `</body></html>`

test('reads the poster’s contact from the escaped payload', () => {
  const html = pageWith({
    typeOfLease: 'Sub Lease', contactName: 'Ada Lovelace', email: 'Ada@Example.com',
    formType: 'Student', timingOfLease: 'January - May', bedroom: '1', bathroom: '1',
  })
  const c = extractContact(html)
  assert.equal(c.email, 'ada@example.com', 'lower-cased for suppression matching')
  assert.equal(c.contactName, 'Ada Lovelace')
  assert.equal(c.formType, 'Student')
  assert.equal(c.timingOfLease, 'January - May')
  assert.equal(c.bedrooms, '1')
})

test('handles values containing escaped slashes', () => {
  const html = pageWith({ typeOfLease: 'Sub Lease', email: 'grace@example.com', timingOfLease: '9/1 - 8/13' })
  const c = extractContact(html)
  assert.equal(c.email, 'grace@example.com')
  assert.equal(c.timingOfLease, '9/1 - 8/13')
})

test('NEVER reads a record sitting outside the current-item marker', () => {
  // A page can carry other JSON blobs — other collections, "similar listings",
  // whatever else Wix bundles. Picking one of those would mean emailing a
  // stranger about someone else's flat — the worst failure this pipeline has.
  // Only the fixed recordsByCollectionId.ApartmentListings location may be read.
  const elsewhere = `,\\"someOtherBlob\\":{\\"typeOfLease\\":\\"Sub Lease\\",\\"email\\":\\"victim@example.com\\"}`
  const html = pageWith({ typeOfLease: 'Sub Lease', email: 'ours@example.com' }, elsewhere)
  assert.equal(extractContact(html).email, 'ours@example.com')
})

test('the price cross-check rejects a mismatched record rather than trust it', () => {
  // Independent safety net: the record's own price must agree with what THIS
  // page's <meta description> states (parsed separately, from plain HTML). A
  // mismatch means the structural anchor found the wrong thing.
  const html = pageWith({ typeOfLease: 'Sub Lease', email: 'x@example.com', price: '1650' })
  assert.equal(extractContact(html, '1650').email, 'x@example.com', 'matching price is accepted')
  assert.equal(extractContact(html, '2000').email, undefined, 'mismatched price is rejected')
  assert.equal(extractContact(html).email, 'x@example.com', 'no expected price = no check, still works')
})

test('returns nothing when the record has no email, rather than borrowing one', () => {
  const html = pageWith({ typeOfLease: 'Sub Lease' }, `,\\"other\\":{\\"email\\":\\"someone@example.com\\"}`)
  assert.equal(extractContact(html).email, undefined)
})

test('returns nothing when the marker or the typeOfLease guard is missing', () => {
  assert.deepEqual(extractContact('<html></html>'), {})
  // A record at the marker with no typeOfLease (e.g. a malformed/partial
  // record) must not be treated as a listing.
  assert.deepEqual(extractContact(pageWith({ email: 'x@example.com' })), {})
})

test('rejects a malformed address rather than passing it on', () => {
  const html = pageWith({ typeOfLease: 'Sub Lease', email: 'not-an-email' })
  assert.equal(extractContact(html).email, undefined)
})

test('a sublet lead carries the contact through to the lead', () => {
  const body = pageWith({
    typeOfLease: 'Sub Lease', email: 'katherine@example.com', contactName: 'Katherine J',
    formType: 'Student', timingOfLease: 'Jan to Aug 2027', price: '1500',
  })
  const html =
    `<html><head><title>Sublease at Landmark | Ann Arbor Universe Housing</title>` +
    `<meta name="description" content="Sub Lease apartment at Sublease at Landmark, listed at $1,500  on Ann Arbor Universe Housing"/></head>` +
    body
  const lead = toLead(html, { id: 'sublease-landmark', url: 'https://example.test/l' })
  assert.equal(lead?.contactEmail, 'katherine@example.com')
  assert.equal(lead?.extracted?.posterType, 'Student')
  assert.equal(lead?.extracted?.dates, 'Jan to Aug 2027')
})

test('a lead is still produced (without contact) when the price cross-check fails', () => {
  // The listing itself is real — facts come from meta tags independently of
  // the contact lookup — only the contact is withheld when something looks off.
  const body = pageWith({ typeOfLease: 'Sub Lease', email: 'x@example.com', price: '999' })
  const html =
    `<html><head><title>Mismatch Listing | Ann Arbor Universe Housing</title>` +
    `<meta name="description" content="Sub Lease apartment at Mismatch Listing, listed at $1,500  on Ann Arbor Universe Housing"/></head>` +
    body
  const lead = toLead(html, { id: 'mismatch-listing', url: 'https://example.test/l' })
  assert.ok(lead, 'the listing itself is still recorded')
  assert.equal(lead.contactEmail, undefined, 'but the mismatched contact is withheld')
})

test('never carries image data', () => {
  const html = page('Sublease at Six11', 'Sub Lease apartment at Sublease at Six11, listed at $900  on Ann Arbor Universe Housing')
  const lead = toLead(html, { id: 'six11', url: 'https://example.test/l' })
  const keys = Object.keys(lead?.extracted ?? {}).join(' ')
  assert.ok(!/image|photo|img/i.test(keys))
})

test('a page missing its meta description yields no lead rather than a bad one', () => {
  assert.equal(toLead('<html><head><title>X | Ann Arbor Universe Housing</title></head></html>', { id: 'x', url: 'u' }), null)
  assert.deepEqual(parseListingFacts(''), { title: undefined, leaseType: undefined, price: undefined })
})

// ── a post that is looked at must be remembered, eligible or not ───────────

test('sanitizeLeads rejects a skip-marked lead but keeps its id for dedupe', () => {
  const { ok, rejected } = sanitizeLeadsOcu([
    { sourceExternalId: 'year-1', title: '9 Year St', skip: 'not a sublet (Year Lease (12 Months))' },
    { sourceExternalId: 'sub-1', title: '8 Sub St', contactEmail: 'a@b.com' },
  ])
  assert.deepEqual(ok.map(l => l.sourceExternalId), ['sub-1'])
  assert.equal(rejected.length, 1)
  assert.match(rejected[0].reason, /not a sublet/)
})

test('an UNREADABLE page is not recorded as ineligible — it must stay retryable', () => {
  // The difference that matters: "Year Lease" is a fact about the listing,
  // while a page we couldn't parse is a fact about the fetch. Recording the
  // second as a permanent skip would blacklist a listing over one bad
  // response, or over a layout change, and never look at it again.
  assert.equal(toLead('<html><head><title>X | Ann Arbor Universe Housing</title></head></html>', { id: 'x', url: 'u' }), null)
})
