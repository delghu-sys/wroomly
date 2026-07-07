import { test, expect } from '@playwright/test'

/**
 * SEO landing-page surface (feature/seo-moat):
 *  - /buildings index is public and lists the researched buildings
 *  - building detail pages carry parseable FAQPage + ApartmentComplex JSON-LD
 *  - the live rent-prices page computes real medians (or honestly says it
 *    can't) and its JSON-LD parses
 */

async function jsonLdTypes(html: string): Promise<string[]> {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
  const types: string[] = []
  for (const [, raw] of blocks) {
    const data = JSON.parse(raw) // throws → test fails on malformed JSON-LD
    for (const node of Array.isArray(data) ? data : [data]) types.push(node['@type'])
  }
  return types
}

test('buildings index is public and lists verified buildings', async ({ request }) => {
  const res = await request.get('/buildings')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain('Verve')
  expect(html).toContain('The Legacy')
  expect(await jsonLdTypes(html)).toContain('ItemList')
})

test('verified building page has FAQPage + ApartmentComplex schema and facts', async ({ request }) => {
  const res = await request.get('/buildings/verve')
  expect(res.status()).toBe(200)
  const html = await res.text()
  const types = await jsonLdTypes(html)
  expect(types).toContain('FAQPage')
  expect(types).toContain('ApartmentComplex')
  expect(html).toContain('721 S Forest Ave')
})

test('unverified building page keeps the honest fallback (no fabricated schema)', async ({ request }) => {
  const res = await request.get('/buildings/lookout')
  expect(res.status()).toBe(200)
  const html = await res.text()
  const types = await jsonLdTypes(html)
  expect(types).toContain('FAQPage')
  expect(types).not.toContain('ApartmentComplex')
})

test('live rent-prices page renders and its schema parses', async ({ request }) => {
  const res = await request.get('/guides/ann-arbor-rent-prices')
  expect(res.status()).toBe(200)
  const html = await res.text()
  const types = await jsonLdTypes(html)
  expect(types).toContain('Article')
  expect(types).toContain('FAQPage')
  // Either real medians or the honest small-sample fallback — never neither.
  expect(html).toMatch(/Median asking rent, all active sublets|Not enough active listings/)
})

test('new guides render with Article + FAQPage schema', async ({ request }) => {
  const res = await request.get('/guides/best-neighborhoods-for-umich-students')
  expect(res.status()).toBe(200)
  const types = await jsonLdTypes(await res.text())
  expect(types).toContain('Article')
  expect(types).toContain('FAQPage')
})
