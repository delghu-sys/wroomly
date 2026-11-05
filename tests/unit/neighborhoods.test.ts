import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NEIGHBORHOOD_CONTENT, neighborhoodDescription } from '../../src/lib/seo/neighborhoods.ts'

test('every neighborhood meta description is a clean sentence of at most 155 characters', () => {
  for (const n of NEIGHBORHOOD_CONTENT) {
    const d = neighborhoodDescription(n)
    assert.ok(d.length <= 155, `${n.slug}: ${d.length} chars`)
    assert.ok(d.endsWith('.'), `${n.slug} ends in a full stop`)
    assert.ok(!d.includes('…') && !d.includes('...'), `${n.slug} has no ellipsis`)
    assert.ok(d.includes(n.name), `${n.slug} names the neighborhood`)
  }
})
