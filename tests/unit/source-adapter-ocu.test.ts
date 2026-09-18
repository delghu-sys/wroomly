import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  umichListingUrls,
  parseListingFacts,
  isSublet,
  toLead,
  extractContact,
} from '../../src/lib/agents/sources/offcampus-universe.ts'

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

test('a year lease produces NO lead', () => {
  const html = page('Cross Street House', 'Year Lease (12 Months) apartment at Cross Street House, listed at $2,600  on Ann Arbor Universe Housing')
  assert.equal(toLead(html, { id: 'cross-street-house', url: 'https://example.test/x' }), null)
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
// on 2026-09-18: records live under recordsByCollectionId → ApartmentListings
// keyed by id, each carrying its own `slug`; quotes are escaped once (\") while
// slashes are escaped twice (\\/). All people and addresses are invented.

const esc = (o: Record<string, string>) =>
  '{' + Object.entries(o).map(([k, v]) => `\\"${k}\\":\\"${v.split('/').join('\\\\/')}\\"`).join(',') + '}'

/** A page with an ApartmentListings block, plus the RoommateProfiles block the
 *  real pages also carry. */
const pageWith = (listings: Record<string, string>[], roommates: Record<string, string>[] = []) =>
  `<html><body>\\"recordsByCollectionId\\":{\\"ApartmentListings\\":{` +
  listings.map(l => `\\"${l.slug}\\":${esc(l)}`).join(',') +
  `},\\"RoommateProfiles\\":{` +
  roommates.map((r, i) => `\\"rp${i}\\":${esc(r)}`).join(',') +
  `}}</body></html>`

test('reads the poster’s contact from the escaped payload', () => {
  const html = pageWith([
    { slug: '1b1b-sublease-beekman', typeOfLease: 'Sub Lease', contactName: 'Ada Lovelace', email: 'Ada@Example.com', formType: 'Student', timingOfLease: 'January - May', bedroom: '1', bathroom: '1' },
  ])
  const c = extractContact(html, '1b1b-sublease-beekman')
  assert.equal(c.email, 'ada@example.com', 'lower-cased for suppression matching')
  assert.equal(c.contactName, 'Ada Lovelace')
  assert.equal(c.formType, 'Student')
  assert.equal(c.timingOfLease, 'January - May')
  assert.equal(c.bedrooms, '1')
})

test('handles a slug-bearing record whose values contain escaped slashes', () => {
  const html = pageWith([
    { slug: 'verve-3-bed4-bath-sublease-abc', typeOfLease: 'Sub Lease', email: 'grace@example.com', timingOfLease: '9/1 - 8/13' },
  ])
  const c = extractContact(html, 'verve-3-bed4-bath-sublease-abc')
  assert.equal(c.email, 'grace@example.com')
  assert.equal(c.timingOfLease, '9/1 - 8/13')
})

test('NEVER takes a neighbouring listing’s address', () => {
  // Pages embed several listings. Picking the wrong one would mean emailing a
  // stranger about someone else's flat — the worst failure this pipeline has.
  const html = pageWith([
    { slug: 'someone-else', typeOfLease: 'Sub Lease', email: 'victim@example.com', contactName: 'Not Ours' },
    { slug: 'ours', typeOfLease: 'Sub Lease', email: 'ours@example.com' },
    { slug: 'another', typeOfLease: 'Year Lease (12 Months)', email: 'other@example.com' },
  ])
  const c = extractContact(html, 'ours')
  assert.equal(c.email, 'ours@example.com')
})

test('NEVER takes an email from the RoommateProfiles collection', () => {
  // Those are students LOOKING for a room — they advertised nothing and must
  // never be contacted from here. Only ApartmentListings carry typeOfLease.
  const html = pageWith(
    [{ slug: 'no-contact-listing', typeOfLease: 'Sub Lease' }],
    [{ slug: 'no-contact-listing', email: 'roommate@example.com', aboutMe: 'Looking for a room', major: 'CS' }],
  )
  const c = extractContact(html, 'no-contact-listing')
  assert.equal(c.email, undefined, 'must not borrow a roommate profile’s address')
})

test('returns nothing when the record has no email, rather than borrowing one', () => {
  const html = pageWith([
    { slug: 'no-contact', typeOfLease: 'Sub Lease' },
    { slug: 'different', typeOfLease: 'Sub Lease', email: 'someone@example.com' },
  ])
  assert.equal(extractContact(html, 'no-contact').email, undefined)
})

test('returns nothing when the slug is absent or unmatched', () => {
  assert.deepEqual(extractContact('<html></html>', 'missing'), {})
  assert.deepEqual(extractContact('<html></html>', ''), {})
})

test('rejects a malformed address rather than passing it on', () => {
  const html = pageWith([{ slug: 'x', typeOfLease: 'Sub Lease', email: 'not-an-email' }])
  assert.equal(extractContact(html, 'x').email, undefined)
})

test('a sublet lead carries the contact through to the lead', () => {
  const body = pageWith([
    { slug: 'sublease-landmark', typeOfLease: 'Sub Lease', email: 'katherine@example.com', contactName: 'Katherine J', formType: 'Student', timingOfLease: 'Jan to Aug 2027' },
  ])
  const html =
    `<html><head><title>Sublease at Landmark | Ann Arbor Universe Housing</title>` +
    `<meta name="description" content="Sub Lease apartment at Sublease at Landmark, listed at $1,500  on Ann Arbor Universe Housing"/></head>` +
    body
  const lead = toLead(html, { id: 'sublease-landmark', url: 'https://example.test/l' })
  assert.equal(lead?.contactEmail, 'katherine@example.com')
  assert.equal(lead?.extracted?.posterType, 'Student')
  assert.equal(lead?.extracted?.dates, 'Jan to Aug 2027')
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
