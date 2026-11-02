import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkReplySend,
  classifyInbound,
  holdUntil,
  matchProspect,
  replyApprovalHash,
  replySubject,
  stripQuoted,
  suggestSendTime,
  timezoneFor,
  type ReplyCheckInput,
  type ReplyEnvelope,
} from '../../src/lib/universities/replies.ts'

// All people, offices and addresses are INVENTED.

const msg = (subject: string, body: string, from = 'office@example.edu') => ({ from, subject, body })

// ── kind ────────────────────────────────────────────────────────────────────

test('an out-of-office or acknowledgement is an auto-reply, and asks us to wait', () => {
  const c = classifyInbound(msg('Automatic reply: Housing in Ann Arbor for your students', 'Thank you for contacting the Global Mobility Office. This is an automated response to acknowledge we have received your message. We typically aim to reply within 5 working days. Please do not follow up.'))
  assert.equal(c.kind, 'auto_reply')
  assert.equal(c.holdDays, 14, '5 working days = a week, plus a week of grace')
  assert.equal(classifyInbound(msg('Out of office', 'I am out of the office until 3 December.')).kind, 'auto_reply')
  assert.equal(classifyInbound(msg('Réponse automatique : Logement', 'Je suis absent jusqu’au 10.')).kind, 'auto_reply')
  assert.equal(classifyInbound(msg('Re: hello', 'This is an automated message. Do not reply.')).kind, 'auto_reply')
})

test('a long stated delay lengthens the hold', () => {
  const c = classifyInbound(msg('Automatic reply', 'We will respond within 10 business days. This is an automated response.'))
  assert.equal(c.holdDays, 21)
})

test('a delivery failure is a bounce, not a person', () => {
  assert.equal(classifyInbound(msg('Undeliverable: Housing in Ann Arbor', 'Your message could not be delivered', 'postmaster@example.edu')).kind, 'bounce')
  assert.equal(classifyInbound(msg('Delivery Status Notification (Failure)', 'x', 'mailer-daemon@googlemail.com')).kind, 'bounce')
})

test('asking us to stop — in any of the languages we write in — is an opt-out', () => {
  for (const body of [
    'Please remove me from your list.',
    'We are not interested, thank you.',
    'Please do not contact us again.',
    'Merci de ne plus nous contacter.',
    'Nous ne sommes pas intéressés, pas intéressé.',
    'No estamos interesados. Por favor no nos escriba más.',
    'Bitte keine weiteren E-Mails.',
    'Unsubscribe',
  ]) assert.equal(classifyInbound(msg('Re: Housing in Ann Arbor', body)).kind, 'opt_out', body)
})

test('an opt-out is not hidden by a polite opening or an auto-reply subject', () => {
  assert.equal(classifyInbound(msg('Re: Housing', 'Hello Hugo, thanks for writing. Unfortunately this is not relevant to our office, please do not contact us again.')).kind, 'opt_out')
})

test('a genuine reply is a person, even when it mentions our email', () => {
  const c = classifyInbound(msg('Re: Housing in Ann Arbor for your students', 'Hello Hugo, thanks for your message. Could you send the one-page overview? We could share it with our nominated students.'))
  assert.equal(c.kind, 'human_reply')
})

test('our own email quoted back at us does not trigger an opt-out', () => {
  const body = 'Yes please, send the overview.\n\nOn Mon, 2 Nov 2026 at 22:21, Hugo from Wroomly <hugodelgado@wroomly.app> wrote:\n> If this isn\'t relevant to your office, just reply and I won\'t write again. Please do not contact us if not interested.'
  assert.equal(classifyInbound(msg('Re: Housing', body)).kind, 'human_reply')
  assert.match(stripQuoted(body), /^Yes please, send the overview\.$/)
})

test('quoted lines and "Le … a écrit" are cut', () => {
  assert.equal(stripQuoted('Merci.\n\nLe 2 nov. 2026 à 22:21, Hugo a écrit :\n> blah'), 'Merci.')
  assert.equal(stripQuoted('Fine.\n> quoted\nStill fine.'), 'Fine.\nStill fine.')
  assert.equal(stripQuoted(null), '')
})

test('the hold date is the reply date plus the hold', () => {
  assert.equal(holdUntil('2026-11-02T22:24:17Z', 14), '2026-11-16T22:24:17.000Z')
})

// ── which university ────────────────────────────────────────────────────────

const prospects = [
  { id: 'alpha', name: 'Alpha School of Management', contact_email: 'exchange@alpha.nl' },
  { id: 'bravo', name: 'Bravo College', contact_email: 'studyabroad@bravo.ac.uk' },
  { id: 'charlie1', name: 'Charlie Business School', contact_email: 'outgoing@charlie.edu' },
  { id: 'charlie2', name: 'Charlie (Master)', contact_email: 'intl@charlie.edu' },
  { id: 'delta', name: 'Delta Paris', contact_email: 'person@delta.fr' },
]

test('an exact address match wins, case-insensitively', () => {
  assert.deepEqual(matchProspect('Exchange@ALPHA.nl', prospects), { prospect: prospects[0], how: 'address' })
})

test('a different person at the same university is matched by domain', () => {
  const r = matchProspect('someone.else@bravo.ac.uk', prospects)
  assert.equal(r.prospect?.id, 'bravo')
  assert.equal(r.how, 'domain')
  assert.equal(matchProspect('x@vms.delta.fr', prospects).prospect?.id, 'delta', 'a subdomain of the same university')
})

test('when two universities share a domain it is ambiguous, and a person decides', () => {
  assert.deepEqual(matchProspect('someone@charlie.edu', prospects), { prospect: null, how: 'ambiguous' })
})

test('an unknown sender matches nothing', () => {
  assert.deepEqual(matchProspect('stranger@elsewhere.org', prospects), { prospect: null, how: 'none' })
  assert.equal(matchProspect('not-an-address', prospects).how, 'none')
})

// ── when ────────────────────────────────────────────────────────────────────

test('countries map to a timezone, and unknown ones are not guessed', () => {
  assert.equal(timezoneFor('Switzerland'), 'Europe/Zurich')
  assert.equal(timezoneFor(' france '), 'Europe/Paris')
  assert.equal(timezoneFor('Atlantis'), null)
  assert.equal(timezoneFor(null), null)
})

test('inside their working day the best time is now', () => {
  // Tuesday 2026-11-17 10:00 UTC = 11:00 in Zurich
  const t = suggestSendTime('Switzerland', new Date('2026-11-17T10:00:00Z'))
  assert.equal(t.now, true)
  assert.match(t.note, /working hours in Zurich/)
})

test('outside their working day it waits for 09:30 their time, on a weekday', () => {
  // Tuesday 2026-11-17 23:00 UTC = Wednesday 00:00 in Zurich → Wednesday 09:30 Zurich = 08:30 UTC
  const t = suggestSendTime('Switzerland', new Date('2026-11-17T23:00:00Z'))
  assert.equal(t.now, false)
  assert.equal(t.at, '2026-11-18T08:30:00.000Z')
  assert.match(t.note, /Wed 09:30 Zurich/)
})

test('a weekend waits for Monday', () => {
  // Saturday 2026-11-21 12:00 UTC (Zurich 13:00)
  const t = suggestSendTime('Switzerland', new Date('2026-11-21T12:00:00Z'))
  assert.equal(t.at, '2026-11-23T08:30:00.000Z')
  assert.match(t.note, /Mon 09:30/)
})

test('Asia is handled in its own day, and an unknown country says so', () => {
  // Tuesday 2026-11-17 01:00 UTC = 10:00 in Tokyo → now
  assert.equal(suggestSendTime('Japan', new Date('2026-11-17T01:00:00Z')).now, true)
  const u = suggestSendTime('Atlantis', new Date('2026-11-17T01:00:00Z'))
  assert.equal(u.now, true)
  assert.match(u.note, /Timezone unknown/)
})

// ── our answer ──────────────────────────────────────────────────────────────

test('our answer is a real reply: Re: subject, never doubled', () => {
  assert.equal(replySubject('Housing in Ann Arbor'), 'Re: Housing in Ann Arbor')
  assert.equal(replySubject('Re: Housing in Ann Arbor'), 'Re: Housing in Ann Arbor')
  assert.equal(replySubject('RE: Housing'), 'RE: Housing')
  assert.equal(replySubject(null), 'Re: your message')
})

const env: ReplyEnvelope = { from: 'Hugo <hugodelgado@wroomly.app>', to: 'office@example.edu', replyTo: 'me@example.com', subject: 'Re: Housing', body: 'Thanks!', inReplyTo: '<abc@example.edu>' }
const base = (over: Partial<ReplyCheckInput> = {}): ReplyCheckInput => ({
  kind: 'human_reply', status: 'approved', envelope: env, approvalHash: replyApprovalHash(env),
  suppressed: new Set(), enabled: true,
  sender: { from_name: 'Hugo', from_email: 'hugodelgado@wroomly.app', reply_to: 'me@example.com' },
  ...over,
})

test('an approved answer to a person may go', () => assert.deepEqual(checkReplySend(base()), { ok: true }))

test('there is nothing to answer for an auto-reply, bounce or opt-out', () => {
  for (const kind of ['auto_reply', 'bounce', 'opt_out'] as const)
    assert.deepEqual(checkReplySend(base({ kind })), { ok: false, reason: 'not-a-person' }, kind)
})

test('every way an answer must not go is refused, with the real reason', () => {
  const refuse = (o: Partial<ReplyCheckInput>, reason: string) => assert.deepEqual(checkReplySend(base(o)), { ok: false, reason }, reason)
  refuse({ status: 'sent' }, 'already-sent')
  refuse({ enabled: false }, 'sending-disabled')
  refuse({ sender: { from_name: 'H', from_email: 'h@gmail.com', reply_to: 'me@example.com' } }, 'sender-misconfigured')
  refuse({ envelope: { ...env, body: '  ' } }, 'empty-message')
  refuse({ status: 'drafted', approvalHash: null }, 'not-approved')
  refuse({ suppressed: new Set(['office@example.edu']) }, 'suppressed')
})

test('changing the text, recipient, sender or thread after approving voids it', () => {
  for (const change of [{ body: 'Edited' }, { subject: 'Re: Other' }, { to: 'x@example.edu' }, { replyTo: 'z@example.com' }, { inReplyTo: '<other@example.edu>' }])
    assert.deepEqual(checkReplySend(base({ envelope: { ...env, ...change } })), { ok: false, reason: 'edited-since-approval' }, JSON.stringify(change))
})
