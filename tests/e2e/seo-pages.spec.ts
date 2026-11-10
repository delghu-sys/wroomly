import { test, expect } from '@playwright/test'

/**
 * SEO landing-page surface (feature/seo-moat):
 *  - /buildings index is public and lists the researched buildings
 *  - building detail pages carry parseable FAQPage + ApartmentComplex JSON-LD
 *  - the live rent-prices page computes real medians (or honestly says it
 *    can't) and its JSON-LD parses
 */

async function jsonLdTypes(html: string): Promise<string[]> {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
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

// ── technical SEO: real 404s, canonicals, indexability ──────────────────────

test('a guide, neighborhood or building that does not exist is a real 404', async ({ request }) => {
  for (const path of ['/guides/this-does-not-exist', '/ann-arbor/not-a-place', '/buildings/not-a-building']) {
    const res = await request.get(path)
    expect(res.status(), `${path} should be HTTP 404, not a 200 "not found" page`).toBe(404)
  }
})

test('pages that exist still answer 200', async ({ request }) => {
  for (const path of ['/guides/ann-arbor-rent-prices', '/guides/how-to-pay-for-a-sublet-safely', '/ann-arbor/central-campus', '/buildings']) {
    expect((await request.get(path)).status(), path).toBe(200)
  }
})

test('each page names itself as the canonical, not the homepage', async ({ request }) => {
  for (const path of ['/about', '/start-listing', '/safety', '/exchange', '/guides']) {
    const html = await (await request.get(path)).text()
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    expect(canonical, path).toBe(`https://wroomly.app${path}`)
  }
})

test('sign-in and sign-up are not indexed', async ({ request }) => {
  for (const path of ['/sign-in', '/sign-up']) {
    const html = await (await request.get(path)).text()
    expect(html, path).toMatch(/<meta name="robots" content="noindex/)
  }
})

test('the exchange page has exactly one h1', async ({ request }) => {
  const html = await (await request.get('/exchange')).text()
  expect(html.match(/<h1[ >]/g)?.length).toBe(1)
})

test('homepage leads with the brand and defines it in plain language', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toMatch(/<title>Wroomly: University of Michigan Sublets in Ann Arbor<\/title>/)
  expect(html.match(/<h1[ >]/g)?.length).toBe(1)
  expect(html).toContain('spelled with a W')
  expect(html).toContain('<link rel="canonical" href="https://wroomly.app"/>')

  const org = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap(([, raw]) => { const d = JSON.parse(raw); return Array.isArray(d) ? d : [d] })
    .find(n => n['@type'] === 'Organization')
  expect(org.name).toBe('Wroomly')
  expect(org.alternateName).toContain('Wroomly.app')
  expect(JSON.stringify(org)).not.toMatch(/vroomly/i)
  expect(org.disambiguatingDescription).toContain('wroomly.app')
  expect(org.sameAs.length).toBeGreaterThan(0)
})

test('UMich sublets landing page is public, has one h1 and parseable FAQPage schema', async ({ request }) => {
  const res = await request.get('/umich-sublets')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html.match(/<h1[\s>]/g)?.length).toBe(1)
  expect(html).toMatch(/<h1[^>]*>[^<]*UMich sublets/)
  expect(html).toContain('<link rel="canonical" href="https://wroomly.app/umich-sublets"')
  const types = await jsonLdTypes(html)
  expect(types).toContain('FAQPage')
  expect(types).toContain('BreadcrumbList')
})
