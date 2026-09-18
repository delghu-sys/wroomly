import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planOutreach, normalizeEmail, type OutreachCandidate } from '../../src/lib/agents/outreach-policy.ts'
import { signUnsubscribe, verifyUnsubscribe } from '../../src/lib/agents/unsubscribe-token.ts'
import { sanitizeLeads } from '../../src/lib/agents/source-adapter.ts'

// Every rule below is one where a bug means emailing somebody we promised not
// to email. They are asserted, not trusted to the send script.

const lead = (p: Partial<OutreachCandidate> & { id: string }): OutreachCandidate => ({
  contact_email: 'a@example.com',
  status: 'drafted',
  import_request_id: 'req-1',
  outreach_sent_at: null,
  ...p,
})
const plan = (candidates: OutreachCandidate[], o: Partial<Parameters<typeof planOutreach>[0]> = {}) =>
  planOutreach({ candidates, suppressed: [], sentInLastDay: 0, dailyCap: 50, ...o })

test('a normal lead with a ready draft is sent', () => {
  const r = plan([lead({ id: '1' })])
  assert.equal(r.send.length, 1)
  assert.deepEqual(r.skipped, [])
})

test('NEVER contacts a suppressed address, regardless of case or whitespace', () => {
  const r = plan([lead({ id: '1', contact_email: '  Opted.Out@Example.COM ' })],
    { suppressed: ['opted.out@example.com'] })
  assert.equal(r.send.length, 0)
  assert.equal(r.skipped[0].reason, 'suppressed')
})

test('NEVER contacts the same lead twice', () => {
  const r = plan([lead({ id: '1', outreach_sent_at: '2026-09-01T00:00:00Z' })])
  assert.equal(r.send.length, 0)
  assert.equal(r.skipped[0].reason, 'already-contacted')
})

test('NEVER contacts the same address twice in one batch', () => {
  const r = plan([
    lead({ id: '1', contact_email: 'dup@example.com' }),
    lead({ id: '2', contact_email: 'DUP@example.com' }), // same person, different case
  ])
  assert.equal(r.send.length, 1)
  assert.equal(r.skipped[0].reason, 'duplicate-in-batch')
})

test('NEVER messages someone before a claimable draft exists', () => {
  assert.equal(plan([lead({ id: '1', status: 'new', import_request_id: null })]).skipped[0].reason, 'no-draft-ready')
  assert.equal(plan([lead({ id: '2', status: 'drafted', import_request_id: null })]).skipped[0].reason, 'no-draft-ready')
})

test('skips leads with no contact address', () => {
  assert.equal(plan([lead({ id: '1', contact_email: null })]).skipped[0].reason, 'no-contact-email')
})

test('honours the daily cap, counting what was already sent today', () => {
  const many = Array.from({ length: 10 }, (_, i) => lead({ id: String(i), contact_email: `u${i}@example.com` }))
  const r = planOutreach({ candidates: many, suppressed: [], sentInLastDay: 8, dailyCap: 10 })
  assert.equal(r.send.length, 2, 'only the 2 remaining under the cap')
  assert.equal(r.skipped.filter(s => s.reason === 'daily-cap-reached').length, 8)
  assert.equal(r.capRemaining, 0)
})

test('a cap already exceeded sends nothing (never negative)', () => {
  const r = planOutreach({ candidates: [lead({ id: '1' })], suppressed: [], sentInLastDay: 99, dailyCap: 10 })
  assert.equal(r.send.length, 0)
  assert.equal(r.capRemaining, 0)
})

test('suppression beats everything else about a lead', () => {
  const r = plan([lead({ id: '1', contact_email: 'x@example.com' })], { suppressed: ['x@example.com'], dailyCap: 999 })
  assert.equal(r.send.length, 0)
})

test('normalizeEmail is null-safe', () => {
  assert.equal(normalizeEmail(null), '')
  assert.equal(normalizeEmail(' A@B.com '), 'a@b.com')
})

// ── unsubscribe tokens ──────────────────────────────────────────────────────
const KEY = 'test-secret-key-that-is-long-enough-000000'

test('an unsubscribe token verifies for its own address', () => {
  const t = signUnsubscribe('person@example.com', KEY)
  assert.equal(verifyUnsubscribe('person@example.com', t, KEY), true)
})

test('a token CANNOT opt out a different address', () => {
  const t = signUnsubscribe('person@example.com', KEY)
  assert.equal(verifyUnsubscribe('victim@example.com', t, KEY), false)
})

test('a forged or empty token is rejected', () => {
  assert.equal(verifyUnsubscribe('person@example.com', 'forged', KEY), false)
  assert.equal(verifyUnsubscribe('person@example.com', '', KEY), false)
})

test('token ignores case/whitespace so the link works as typed in an email', () => {
  const t = signUnsubscribe('person@example.com', KEY)
  assert.equal(verifyUnsubscribe('  Person@Example.com ', t, KEY), true)
})

// ── adapter sanitation ──────────────────────────────────────────────────────
test('sanitizeLeads rejects missing ids, duplicates and malformed emails', () => {
  const { ok, rejected } = sanitizeLeads([
    { sourceExternalId: 'a', contactEmail: 'good@example.com' },
    { sourceExternalId: '', contactEmail: 'good@example.com' },
    { sourceExternalId: 'a' },
    { sourceExternalId: 'b', contactEmail: 'not-an-email' },
    { sourceExternalId: 'c' },
  ])
  assert.deepEqual(ok.map(l => l.sourceExternalId), ['a', 'c'])
  assert.deepEqual(rejected.map(r => r.reason), [
    'missing sourceExternalId', 'duplicate sourceExternalId', 'malformed contactEmail',
  ])
})
