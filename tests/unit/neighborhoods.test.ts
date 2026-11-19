import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampTitle } from '../../src/lib/seo/meta.ts'
import { NEIGHBORHOOD_CONTENT, neighborhoodDescription, neighborhoodTitle } from '../../src/lib/seo/neighborhoods.ts'

test('every neighborhood meta description is a clean sentence of at most 155 characters', () => {
  for (const n of NEIGHBORHOOD_CONTENT) {
    const d = neighborhoodDescription(n)
    assert.ok(d.length <= 155, `${n.slug}: ${d.length} chars`)
    assert.ok(d.endsWith('.'), `${n.slug} ends in a full stop`)
    assert.ok(!d.includes('…') && !d.includes('...'), `${n.slug} has no ellipsis`)
    assert.ok(d.includes(n.name), `${n.slug} names the neighborhood`)
  }
})

const words = (s: string) => s.trim().split(/\s+/).length

test('every neighborhood title fits 60 characters with the Wroomly suffix', () => {
  for (const n of NEIGHBORHOOD_CONTENT) {
    const t = `${clampTitle(neighborhoodTitle(n))} | Wroomly`
    assert.ok(t.length <= 60, `${n.slug}: ${t.length} chars`)
    if (n.searchTitle) assert.ok(n.searchTitle.length <= 50, `${n.slug}: searchTitle would be clamped`)
  }
})

test('optional FAQ blocks have 3 to 4 plain answers of 40 to 60 words', () => {
  for (const n of NEIGHBORHOOD_CONTENT) {
    if (!n.faqs) continue
    assert.ok(n.faqs.length >= 3 && n.faqs.length <= 4, `${n.slug}: ${n.faqs.length} faqs`)
    for (const f of n.faqs) {
      const w = words(f.answer)
      assert.ok(w >= 40 && w <= 60, `${n.slug}: "${f.question}" answer is ${w} words`)
    }
  }
})

test('neighborhood copy has no em or en dashes and internal links are site paths', () => {
  for (const n of NEIGHBORHOOD_CONTENT) {
    if (!n.sections && !n.faqs && !n.links) continue
    assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(n)), `${n.slug} has a dash`)
    for (const l of n.links ?? []) assert.ok(l.href.startsWith('/'), `${n.slug}: ${l.href}`)
    for (const l of n.sources ?? []) assert.ok(l.href.startsWith('https://'), `${n.slug}: ${l.href}`)
  }
})
