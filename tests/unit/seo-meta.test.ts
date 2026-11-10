import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampMeta, clampTitle } from '../../src/lib/seo/meta.ts'
import { buildSitemap } from '../../src/lib/seo/sitemap-entries.ts'
import { GUIDES } from '../../src/lib/seo/guides.ts'
import { NEIGHBORHOOD_CONTENT } from '../../src/lib/seo/neighborhoods.ts'

test('clampMeta leaves short text alone and cuts long text at a word with an ellipsis', () => {
  assert.equal(clampMeta('Short and fine.'), 'Short and fine.')
  const long = 'Sublet at The Yard in Ann Arbor. University of Michigan student sublets, plus floor plans, amenities, and location facts. Verified UMich students carry a blue check.'
  const out = clampMeta(long)
  assert.ok(out.length <= 155, String(out.length))
  assert.ok(out.endsWith('…'))
  assert.ok(!/\s…$/.test(out), 'no dangling space before the ellipsis')
  assert.ok(long.startsWith(out.slice(0, -1)), 'it is a prefix of the original, cut on a word')
  assert.equal(clampMeta('a   b\n c'), 'a b c', 'whitespace is collapsed')
})

test('clampTitle leaves room for the " | Wroomly" suffix', () => {
  const t = clampTitle('Sublets at A Very Long Building Name That Goes On And On in Ann Arbor')
  assert.ok(t.length + ' | Wroomly'.length <= 60, String(t.length))
  assert.equal(clampTitle('Sublets at The Yard in Ann Arbor'), 'Sublets at The Yard in Ann Arbor')
})

const input = {
  listings: [
    { id: 'a', updated_at: '2026-11-01T10:00:00Z', created_at: '2026-10-01T00:00:00Z' },
    { id: 'b', updated_at: null, created_at: '2026-11-04T09:00:00Z' },
  ],
  neighborhoods: ['central-campus'],
  buildings: ['the-yard'],
  guides: [{ slug: 'g1', updated: '2026-09-01' }, { slug: 'g2', updated: '2026-10-20' }],
}
const entries = buildSitemap(input)
const byPath = (p: string) => entries.find(e => e.url === `https://wroomly.app${p}`)

test('sitemap: public acquisition pages in, sign-in and sign-up out', () => {
  for (const p of ['/', '/listings', '/umich-sublets', '/about', '/exchange', '/match', '/import-listing', '/safety', '/guides', '/buildings', '/guides/ann-arbor-rent-prices']) {
    assert.ok(byPath(p), `${p} missing`)
  }
  assert.ok(!byPath('/sign-in') && !byPath('/sign-up'))
  assert.equal(new Set(entries.map(e => e.url)).size, entries.length, 'no duplicates')
})

test('sitemap: a date only where it is true', () => {
  const latest = '2026-11-04T09:00:00.000Z'
  assert.equal(byPath('/')!.lastModified?.toString(), new Date(latest).toString(), 'home follows the latest listing change')
  assert.equal(byPath('/listings')!.lastModified?.toString(), new Date(latest).toString())
  assert.equal(byPath('/guides')!.lastModified?.toString(), new Date('2026-10-20').toString(), 'guides index follows the newest guide')
  assert.equal(byPath('/guides/g1')!.lastModified?.toString(), new Date('2026-09-01').toString())
  assert.equal(byPath('/listings/a')!.lastModified?.toString(), new Date('2026-11-01T10:00:00Z').toString())
  assert.equal(byPath('/listings/b')!.lastModified?.toString(), new Date('2026-11-04T09:00:00Z').toString(), 'falls back to created_at')
  for (const p of ['/about', '/terms', '/privacy', '/safety', '/exchange', '/buildings', '/buildings/the-yard']) {
    assert.equal(byPath(p)!.lastModified, undefined, `${p} has no honest date, so none`)
  }
  const none = buildSitemap({ ...input, listings: [] })
  assert.equal(none.find(e => e.url === 'https://wroomly.app/')!.lastModified, undefined, 'with no listings, no invented date')
})

test('the real guides and neighborhoods all make it into the sitemap', () => {
  const all = buildSitemap({
    listings: [],
    neighborhoods: NEIGHBORHOOD_CONTENT.map(n => n.slug),
    buildings: [],
    guides: GUIDES.map(g => ({ slug: g.slug, updated: g.updated })),
  })
  for (const g of GUIDES) assert.ok(all.some(e => e.url.endsWith(`/guides/${g.slug}`)), g.slug)
  assert.equal(all.filter(e => e.url.includes('/ann-arbor/')).length, NEIGHBORHOOD_CONTENT.length)
})

test('guide titles and descriptions fit a results page', () => {
  for (const g of GUIDES) {
    const title = `${g.seoTitle ?? g.title} | Wroomly`
    assert.ok(g.seoTitle ?? g.title, g.slug)
    assert.ok(title.length <= 65, `${g.slug} title is ${title.length}: ${title}`)
    assert.ok(!(g.seoTitle ?? '').includes('| Wroomly'), `${g.slug} doubles the brand suffix`)
    // The page clamps this to 155 for the search snippet; the full text is the on-page lede.
    assert.ok(g.description.length >= 70 && g.description.length <= 210, `${g.slug} description is ${g.description.length}`)
    assert.ok(clampMeta(g.description).length <= 155, g.slug)
  }
})
