import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOLLOWUP_MIN_DAYS,
  checkFollowupSend,
  daysSince,
  followupApprovalHash,
  followupState,
  formatSentDate,
  isFollowupDue,
  renderFollowup,
  type FollowupCheckInput,
} from '../../src/lib/universities/followup.ts'
import { approvalHash, type Envelope } from '../../src/lib/universities/gate.ts'

// All names and addresses are INVENTED.

const NOW = new Date('2026-11-14T12:00:00Z')
const FIRST = '2026-11-02T22:21:36.000Z' // 11 days before NOW

test('the minimum wait is ten days', () => assert.equal(FOLLOWUP_MIN_DAYS, 10))

test('days are counted from the first email', () => {
  assert.equal(daysSince(FIRST, NOW), 11)
  assert.equal(daysSince(null, NOW), null)
  assert.equal(daysSince('garbage', NOW), null)
})

test('a follow-up is due only for a sent, unanswered, not-yet-followed-up university after ten days', () => {
  const row = (over: object = {}) => ({ status: 'sent' as const, sent_at: FIRST, followup_sent_at: null, ...over })
  assert.equal(isFollowupDue(row(), NOW), true)
  assert.equal(isFollowupDue(row({ sent_at: '2026-11-05T12:00:00Z' }), NOW), false, '9 days is too soon')
  assert.equal(isFollowupDue(row({ sent_at: '2026-11-04T12:00:00Z' }), NOW), true, 'exactly 10 days is enough')
  assert.equal(isFollowupDue(row({ status: 'replied' }), NOW), false)
  assert.equal(isFollowupDue(row({ status: 'declined' }), NOW), false)
  assert.equal(isFollowupDue(row({ status: 'approved' }), NOW), false, 'the first email has not gone out')
  assert.equal(isFollowupDue(row({ followup_sent_at: '2026-11-13T00:00:00Z' }), NOW), false, 'there is only ever one')
  assert.equal(isFollowupDue(row({ sent_at: null }), NOW), false)
})

test('the follow-up state follows the draft → approved → sent order', () => {
  const s = (o: object) => followupState({ followup_subject: null, followup_approval_hash: null, followup_sent_at: null, ...o })
  assert.equal(s({}), 'none')
  assert.equal(s({ followup_subject: 'x' }), 'drafted')
  assert.equal(s({ followup_subject: 'x', followup_approval_hash: 'h' }), 'approved')
  assert.equal(s({ followup_subject: 'x', followup_approval_hash: 'h', followup_sent_at: 'd' }), 'sent')
})

// ── the text ────────────────────────────────────────────────────────────────

const en = { name: 'Example University', country: 'Germany', umich_units: ['Ross'], office_name: 'Exchange Office', contact_name: null }
const fr = { ...en, name: 'ESSEC Business School', country: 'France' }

test('the English follow-up names the date of the first email and is one short nudge', () => {
  const e = renderFollowup(en, FIRST)
  assert.match(e.subject, /^Following up: /)
  assert.doesNotMatch(e.subject, /^Re:/i, 'no fake "Re:" — it is not a reply')
  assert.match(e.body, /^Dear Exchange Office,/)
  assert.match(e.body, /I wrote to you on November 2 about Wroomly/)
  assert.match(e.body, /just let me know and I won't write again/)
  assert.doesNotMatch(e.body, /\{\{/)
  assert.ok(e.body.length < 900, 'it stays short')
})

test('a French university gets the French follow-up with a French date', () => {
  const e = renderFollowup(fr, FIRST)
  assert.match(e.subject, /^Relance : /)
  assert.match(e.body, /^Madame, Monsieur,/)
  assert.match(e.body, /Je vous ai écrit le 2 novembre au sujet de Wroomly/)
  assert.doesNotMatch(e.body, /\{\{|Dear/)
})

test('dates are formatted in UTC, so the day matches the record', () => {
  assert.equal(formatSentDate('2026-11-02T23:59:59Z', 'en'), 'November 2')
  assert.equal(formatSentDate('2026-11-02T23:59:59Z', 'fr'), '2 novembre')
})

// ── the gate ────────────────────────────────────────────────────────────────

const env: Envelope = { from: 'Hugo <hugodelgado@wroomly.app>', to: 'x@example.edu', replyTo: 'me@example.com', subject: 'Following up', body: 'Body' }
const base = (over: Partial<FollowupCheckInput> = {}): FollowupCheckInput => ({
  status: 'sent', sentAt: FIRST, followupSentAt: null, contactEmail: 'x@example.edu',
  approvalHash: followupApprovalHash(env), envelope: env, now: NOW,
  suppressed: new Set(), sentInLastDay: 0, dailyCap: 100, enabled: true,
  sender: { from_name: 'Hugo', from_email: 'hugodelgado@wroomly.app', reply_to: 'me@example.com' },
  ...over,
})

test('an approved follow-up, after ten days, to a clean address may go', () => {
  assert.deepEqual(checkFollowupSend(base()), { ok: true })
})

test('every way a follow-up must NOT go is refused, with the real reason', () => {
  const refuse = (over: Partial<FollowupCheckInput>, reason: string) => assert.deepEqual(checkFollowupSend(base(over)), { ok: false, reason }, reason)
  refuse({ status: 'replied' }, 'replied-or-declined')
  refuse({ status: 'declined' }, 'replied-or-declined')
  refuse({ status: 'approved' }, 'not-sent-yet')
  refuse({ followupSentAt: '2026-11-13T00:00:00Z' }, 'followup-already-sent')
  refuse({ enabled: false }, 'sending-disabled')
  refuse({ sender: { from_name: 'H', from_email: 'h@gmail.com', reply_to: 'me@example.com' } }, 'sender-misconfigured')
  refuse({ contactEmail: null }, 'no-contact-email')
  refuse({ approvalHash: null }, 'not-approved')
  refuse({ sentAt: '2026-11-08T12:00:00Z' }, 'too-soon')
  refuse({ suppressed: new Set(['x@example.edu']) }, 'suppressed')
  refuse({ sentInLastDay: 100 }, 'daily-cap-reached')
})

test('changing anything after approving the follow-up voids the approval', () => {
  for (const change of [{ body: 'Edited' }, { subject: 'Edited' }, { to: 'y@example.edu' }, { replyTo: 'z@example.com' }]) {
    assert.deepEqual(checkFollowupSend(base({ envelope: { ...env, ...change } })), { ok: false, reason: 'edited-since-approval' }, JSON.stringify(change))
  }
})

test('a first-email approval can never be used to send a follow-up', () => {
  assert.notEqual(approvalHash(env), followupApprovalHash(env))
  assert.deepEqual(checkFollowupSend(base({ approvalHash: approvalHash(env) })), { ok: false, reason: 'edited-since-approval' })
})
