import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitAccent, topicOf, sectionIds, formatUpdated, TOPICS } from '../../src/lib/guides/present.ts'
import { GUIDES } from '../../src/lib/seo/guides.ts'

test('the headline accent is the last word or two, never a bare connector', () => {
  assert.deepEqual(splitAccent('How to pay for a sublet without getting burned'), { lead: 'How to pay for a sublet without', accent: 'getting burned' })
  assert.deepEqual(splitAccent('How to sublet your apartment at the University of Michigan'), { lead: 'How to sublet your apartment at the University of', accent: 'Michigan' })
  assert.deepEqual(splitAccent('Do you need a car if you live off campus at UMich?'), { lead: 'Do you need a car if you live off campus at', accent: 'UMich?' })
  assert.deepEqual(splitAccent('Sublet scams'), { lead: '', accent: 'Sublet scams' })
  for (const g of GUIDES) {
    const { lead, accent } = splitAccent(g.title)
    assert.equal([lead, accent].filter(Boolean).join(' '), g.title.trim(), `nothing lost for ${g.slug}`)
    assert.ok(accent.length > 0)
  }
})

test('every guide gets a topic from the fixed list, and the common cases land where a reader expects', () => {
  for (const g of GUIDES) assert.ok(TOPICS.includes(topicOf(g.slug)), g.slug)
  assert.equal(topicOf('how-to-avoid-sublet-scams-ann-arbor'), 'Safety and money')
  assert.equal(topicOf('find-a-roommate-umich-off-campus'), 'Roommates and leases')
  assert.equal(topicOf('winter-semester-sublets-ann-arbor'), 'Timing')
  assert.equal(topicOf('best-neighborhoods-for-umich-students'), 'Where to live')
  assert.equal(topicOf('something-unrelated'), 'Subletting')
})

test('section anchors are url-safe and unique', () => {
  const ids = sectionIds(['First: check your lease', "What's a deposit?", 'First: check your lease', '???'])
  assert.deepEqual(ids, ['first-check-your-lease', 'whats-a-deposit', 'first-check-your-lease-2', 'section-4'])
  assert.equal(new Set(ids).size, ids.length)
})

test('every guide has unique anchors for its own sections', () => {
  for (const g of GUIDES) {
    const ids = sectionIds(g.sections.map(s => s.heading))
    assert.equal(new Set(ids).size, ids.length, g.slug)
  }
})

test('the updated date reads the same in every time zone', () => {
  assert.equal(formatUpdated('2026-11-03'), 'November 3, 2026')
})
