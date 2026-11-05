import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GUIDE_SLUGS, GUIDE_ROUTE_SLUGS, NEIGHBORHOOD_SLUGS, BUILDING_SLUGS, isUnknownSeoPage, slugifyName } from '../../src/lib/seo/known-pages.ts'
import { GUIDES } from '../../src/lib/seo/guides.ts'
import { NEIGHBORHOOD_CONTENT } from '../../src/lib/seo/neighborhoods.ts'

// These lists decide which URLs get a real 404. If they fall behind the real
// data, a page that exists would 404, so the tests compare them to the source.

test('the written-out guide list is exactly the guides that exist', () => {
  assert.deepEqual([...GUIDE_SLUGS].sort(), GUIDES.map(g => g.slug).sort(), 'add the new guide to GUIDE_SLUGS in src/lib/seo/known-pages.ts')
})

test('the written-out neighborhood list is exactly the neighborhoods that exist', () => {
  assert.deepEqual([...NEIGHBORHOOD_SLUGS].sort(), NEIGHBORHOOD_CONTENT.map(n => n.slug).sort())
})

test('building slugs come from the same name list and slugify the pages use', () => {
  assert.ok(BUILDING_SLUGS.length >= 20)
  assert.ok(BUILDING_SLUGS.includes('the-yard'))
  assert.equal(slugifyName('Hub & Co.'), 'hub-and-co')
  // buildings.ts must use the shared function, not its own copy.
  const src = readFileSync(new URL('../../src/lib/seo/buildings.ts', import.meta.url), 'utf8')
  assert.match(src, /slug: slugifyName\(name\)/)
  assert.doesNotMatch(src, /function slugify\(/)
})

test('real pages are never reported as unknown', () => {
  for (const s of GUIDE_ROUTE_SLUGS) assert.equal(isUnknownSeoPage(`/guides/${s}`), false, s)
  for (const s of NEIGHBORHOOD_SLUGS) assert.equal(isUnknownSeoPage(`/ann-arbor/${s}`), false, s)
  for (const s of BUILDING_SLUGS) assert.equal(isUnknownSeoPage(`/buildings/${s}`), false, s)
})

test('a made-up slug is unknown, and unrelated paths are left alone', () => {
  for (const p of ['/guides/nope', '/ann-arbor/nope', '/buildings/nope', '/guides/%E0%A4%A', '/guides/THE-YARD']) assert.equal(isUnknownSeoPage(p), true, p)
  for (const p of ['/', '/guides', '/buildings', '/ann-arbor', '/listings/abc', '/guides/a/b', '/api/guides/x', '/about', '/admin/listings/abc']) assert.equal(isUnknownSeoPage(p), false, p)
})
