import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasSexPreference, leadToExtractedDraft } from '../../src/lib/agents/to-draft.ts'

// Wording modelled on real listings, invented for the test.
test('a sex-based preference is recognised in the phrasings hosts use', () => {
  assert.equal(hasSexPreference('I am looking for a girl to sublease my bedroom.'), true)
  assert.equal(hasSexPreference('WINTER LEASE TAKEOVER. must be female.'), true)
  assert.equal(hasSexPreference('females only, quiet house'), true)
  assert.equal(hasSexPreference('No men please'), true)
  assert.equal(hasSexPreference('prefer a guy roommate'), true)
})

test('ordinary descriptions are not flagged', () => {
  assert.equal(hasSexPreference('Quiet room, 5 minute walk to the Diag. I am a girl studying nursing.'), false)
  assert.equal(hasSexPreference('Two bedrooms, furnished, women’s basketball games nearby.'), false)
  assert.equal(hasSexPreference(null), false)
})

const base = { sourceLabel: 'SubLeaps (Ann Arbor)', contactEmail: 'x@example.com' }

test('a draft drops the host’s sex-based wording and asks the host to write their own', () => {
  const draft = leadToExtractedDraft({
    ...base,
    title: 'VIC VILLAGE SOUTH SINGLE BEDROOM SUBLEASE',
    extracted: { price: '$1,200', description: 'I am looking for a girl to sublease my bedroom. Furnished.' },
  })
  assert.equal(draft.description, null)
  assert.ok(draft.uncertaintyNotes.some((n: string) => /who it wanted as a tenant/.test(n)))
  assert.ok(!JSON.stringify(draft).toLowerCase().includes('girl'), 'the wording appears nowhere in the draft')
})

test('a title with the preference is handled the same way', () => {
  const draft = leadToExtractedDraft({ ...base, title: 'Female only room near campus', extracted: { description: 'Quiet, furnished.' } })
  assert.equal(draft.description, null)
})

test('an ordinary post keeps its description and gets no note about tenants', () => {
  const draft = leadToExtractedDraft({ ...base, title: 'Room near the Diag', extracted: { description: 'Quiet, furnished room.' } })
  assert.equal(draft.description, 'Quiet, furnished room.')
  assert.ok(!draft.uncertaintyNotes.some((n: string) => /who it wanted as a tenant/.test(n)))
})
