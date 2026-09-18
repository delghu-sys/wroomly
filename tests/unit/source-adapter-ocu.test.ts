import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  umichListingUrls,
  parseListingFacts,
  isSublet,
  toLead,
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

test('NEVER carries a contact email — this board gates and meters the reveal', () => {
  const html = page('Sublease at Landmark', 'Sub Lease apartment at Sublease at Landmark, listed at $1,500  on Ann Arbor Universe Housing')
  const lead = toLead(html, { id: 'sublease-landmark', url: 'https://example.test/l' })
  assert.equal(lead?.contactEmail, undefined)
  // The outreach policy must therefore skip it; that is the intended outcome.
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
