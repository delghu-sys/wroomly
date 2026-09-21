import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSuppression } from '../../src/lib/agents/resend-events.ts'

const bounce = (type: string, to = ['dead@umich.edu']) => ({
  type: 'email.bounced',
  created_at: '2026-09-21T00:00:00Z',
  data: { email_id: 'e1', from: 'x', subject: 's', to, bounce: { type, subType: 'General', message: 'nope' } },
})

const complaint = (to = ['annoyed@umich.edu']) => ({
  type: 'email.complained',
  created_at: '2026-09-21T00:00:00Z',
  data: { email_id: 'e1', from: 'x', subject: 's', to },
})

// ── what must suppress ──────────────────────────────────────────────────────

test('a spam complaint always suppresses — this is the event that matters most', () => {
  assert.deepEqual(planSuppression(complaint()), {
    emails: ['annoyed@umich.edu'],
    reason: 'complaint',
  })
})

test('a permanent bounce suppresses', () => {
  assert.deepEqual(planSuppression(bounce('Permanent')), {
    emails: ['dead@umich.edu'],
    reason: 'bounced',
  })
})

test('an undetermined bounce suppresses — reputation costs more than one lead', () => {
  assert.equal(planSuppression(bounce('Undetermined'))?.reason, 'bounced')
})

test('bounce type casing and whitespace from the wire do not change the decision', () => {
  for (const t of ['permanent', 'PERMANENT', ' Permanent ']) {
    assert.equal(planSuppression(bounce(t))?.reason, 'bounced', `failed for ${JSON.stringify(t)}`)
  }
})

// ── what must NOT suppress ──────────────────────────────────────────────────

test('a TRANSIENT bounce does NOT suppress — a full mailbox is not a dead address', () => {
  assert.equal(planSuppression(bounce('Transient')), null)
})

test('a bounce with no classification does NOT suppress — refuse to guess', () => {
  assert.equal(planSuppression({ type: 'email.bounced', data: { to: ['x@y.com'] } }), null)
  assert.equal(planSuppression({ type: 'email.bounced', data: { to: ['x@y.com'], bounce: {} } }), null)
})

test('ordinary lifecycle events are ignored', () => {
  for (const type of ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.delivery_delayed']) {
    assert.equal(planSuppression({ type, data: { to: ['x@y.com'] } }), null, type)
  }
})

test('a complaint with no recipient yields nothing rather than an empty write', () => {
  assert.equal(planSuppression(complaint([])), null)
  assert.equal(planSuppression({ type: 'email.complained', data: {} }), null)
})

test('junk does not throw', () => {
  for (const junk of [null, undefined, 'string', 42, [], {}, { type: null }]) {
    assert.equal(planSuppression(junk), null)
  }
})

// ── recipient handling ──────────────────────────────────────────────────────

test('every recipient of a multi-address bounce is suppressed', () => {
  const plan = planSuppression(bounce('Permanent', ['a@x.com', 'b@y.com']))
  assert.deepEqual(plan?.emails, ['a@x.com', 'b@y.com'])
})

test('addresses are normalized, so the suppression check actually matches at send time', () => {
  const plan = planSuppression(bounce('Permanent', ['  Dead@UMich.edu  ']))
  assert.deepEqual(plan?.emails, ['dead@umich.edu'])
})

test('duplicates collapse, and non-addresses are dropped', () => {
  const plan = planSuppression(bounce('Permanent', ['a@x.com', 'A@X.com', 'not-an-email', '']))
  assert.deepEqual(plan?.emails, ['a@x.com'])
})

test('a non-string in the to array is skipped, not stringified into a fake address', () => {
  const plan = planSuppression(bounce('Permanent', ['a@x.com', null as unknown as string, 7 as unknown as string]))
  assert.deepEqual(plan?.emails, ['a@x.com'])
})
