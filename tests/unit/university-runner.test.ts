import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draftAll, saveDraft, approve, approveAll, unapprove, sendOne, sendApproved, testSend, testTemplate, markOutcome, saveSettings, type MailSender } from '../../src/lib/universities/runner.ts'

// A tiny in-memory stand-in for the three tables the runner touches. Only the
// query shapes the runner actually uses are implemented. All data is INVENTED.

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function fakeDb(seed: { prospects: Row[]; suppressions?: Row[]; settings?: Row[] }) {
  const tables: Record<string, Row[]> = {
    university_prospects: seed.prospects,
    outreach_suppressions: seed.suppressions ?? [],
    partner_outreach_settings: seed.settings ?? [],
  }
  const db = {
    tables,
    from(name: string) {
      const filters: ((r: Row) => boolean)[] = []
      let op: 'select' | 'update' = 'select'
      let patch: Row = {}
      let order: { k: string; asc: boolean } | null = null
      let head = false
      let wantCount = false
      const run = () => {
        let rows = tables[name].filter(r => filters.every(f => f(r)))
        if (order) rows = [...rows].sort((a, b) => (a[order!.k] < b[order!.k] ? -1 : 1) * (order!.asc ? 1 : -1))
        if (op === 'update') for (const r of rows) Object.assign(r, patch)
        return { data: head ? null : rows.map(r => ({ ...r })), error: null, count: wantCount ? rows.length : null }
      }
      const api: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        select: (_c?: string, o?: { count?: string; head?: boolean }) => { wantCount = !!o?.count; head = !!o?.head; return api },
        eq: (k: string, v: unknown) => (filters.push(r => r[k] === v), api),
        not: (k: string, _o: string, v: unknown) => (filters.push(r => r[k] !== v), api),
        gte: (k: string, v: string) => (filters.push(r => r[k] != null && r[k] >= v), api),
        order: (k: string, o?: { ascending?: boolean }) => ((order = { k, asc: o?.ascending !== false }), api),
        update: (p: Row) => ((op = 'update'), (patch = p), api),
        upsert: (row: Row | Row[], o?: { onConflict?: string }) => {
          for (const r of Array.isArray(row) ? row : [row]) {
            const key = o?.onConflict ?? 'id'
            const have = tables[name].find(x => x[key] === r[key])
            if (have) Object.assign(have, r); else tables[name].push({ ...r })
          }
          return Promise.resolve({ error: null })
        },
        maybeSingle: () => { const { data } = run(); return Promise.resolve({ data: data?.[0] ?? null, error: null }) },
        then: (res: (v: unknown) => void) => res(run()),
      }
      return api
    },
  }
  return db
}

const prospect = (o: Row = {}): Row => ({
  id: 'p1', slug: 'example-university', name: 'Example University', country: 'Sweden', city: null, website: null,
  umich_units: ['Ross'], evidence_url: null, office_name: 'Exchange Office', office_page_url: null,
  contact_email: 'exchange@example.edu', contact_email_source_url: 'https://example.edu/x', contact_kind: 'office',
  contact_name: null, contact_form_url: null, phone: null, confidence: 'verified', notes: null, status: 'researched',
  subject: null, body: null, approved_at: null, approval_hash: null, sent_at: null, sent_message_id: null,
  sent_snapshot: null, replied_at: null, reply_note: null, created_at: '2026-11-01T00:00:00Z', ...o,
})

const goodSettings = { id: 'default', from_name: 'Hugo from Wroomly', from_email: 'hugo@wroomly.app', reply_to: 'me@example.com', daily_cap: 10, subject: 'Housing for {{university}} students', body: '{{greeting}}\n\n{{partnership}}.' }

function mailer() {
  const sent: Parameters<MailSender>[0][] = []
  const send: MailSender = async m => { sent.push(m); return { id: `msg_${sent.length}` } }
  return { sent, send }
}

async function approvedDb(extra: Row[] = []) {
  const db = fakeDb({ prospects: [prospect(), ...extra], settings: [{ ...goodSettings }] })
  await draftAll(db as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const p of db.tables.university_prospects) if (p.status === 'drafted') await approve(db as any, p.id) // eslint-disable-line @typescript-eslint/no-explicit-any
  return db
}
const D = (db: ReturnType<typeof fakeDb>) => db as any // eslint-disable-line @typescript-eslint/no-explicit-any

test('drafting fills subject and body for universities with an address and leaves the rest alone', async () => {
  const db = fakeDb({ prospects: [prospect(), prospect({ id: 'p2', slug: 'no-email', name: 'No Email U', contact_email: null, confidence: 'not_found' }), prospect({ id: 'p3', slug: 'done', name: 'Done U', status: 'sent' })], settings: [{ ...goodSettings }] })
  const r = await draftAll(D(db))
  assert.deepEqual(r, { drafted: 1, skippedNoEmail: 1, untouched: 1 })
  const p1 = db.tables.university_prospects[0]
  assert.equal(p1.status, 'drafted')
  assert.equal(p1.subject, 'Housing for Example University students')
  assert.match(p1.body, /Dear Exchange Office,\n\nExample University is an exchange partner of the Ross School of Business\./)
  assert.equal(db.tables.university_prospects[2].subject, null, 'a sent one is never rewritten')
})

test('nothing can be approved until a reply-to exists', async () => {
  const db = fakeDb({ prospects: [prospect()], settings: [{ ...goodSettings, reply_to: '' }] })
  await draftAll(D(db))
  await assert.rejects(approve(D(db), 'p1'), /Reply-to is not set/)
})

test('approve → send: the message goes once, from the configured sender, and is recorded as sent', async () => {
  const db = await approvedDb()
  const { sent, send } = mailer()
  const o = await sendOne(D(db), 'p1', { send, enabled: true })
  assert.equal(o.sent, true)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].from, 'Hugo from Wroomly <hugo@wroomly.app>')
  assert.equal(sent[0].to, 'exchange@example.edu')
  assert.equal(sent[0].replyTo, 'me@example.com')
  const row = db.tables.university_prospects[0]
  assert.equal(row.status, 'sent')
  assert.equal(row.sent_message_id, 'msg_1')
  assert.equal(row.sent_snapshot.from, 'Hugo from Wroomly <hugo@wroomly.app>', 'what went out is frozen on the row')
  assert.equal(row.sent_snapshot.body, sent[0].text)

  const again = await sendOne(D(db), 'p1', { send, enabled: true })
  assert.equal(again.sent, false)
  assert.equal(again.reason, 'already-sent')
  assert.equal(sent.length, 1, 'never twice')
})

test('with the real-send switch off nothing is mailed and the approval is kept', async () => {
  const db = await approvedDb()
  const { sent, send } = mailer()
  const o = await sendOne(D(db), 'p1', { send, enabled: false })
  assert.equal(o.reason, 'sending-disabled')
  assert.equal(sent.length, 0)
  assert.equal(db.tables.university_prospects[0].status, 'approved')
})

test('editing after approval voids it: the edited text must be approved again', async () => {
  const db = await approvedDb()
  await saveDraft(D(db), 'p1', { subject: 'A new subject', body: 'A new body' })
  const row = db.tables.university_prospects[0]
  assert.equal(row.status, 'drafted')
  assert.equal(row.approval_hash, null)
  const { sent, send } = mailer()
  assert.equal((await sendOne(D(db), 'p1', { send, enabled: true })).reason, 'not-approved')
  assert.equal(sent.length, 0)
})

test('changing the sender or reply-to after approval voids it too', async () => {
  const db = await approvedDb()
  await saveSettings(D(db), { ...goodSettings, from_name: 'Hugo from Wroomly', from_email: 'hugo@wroomly.app', reply_to: 'someone-else@example.com', subject: goodSettings.subject, body: goodSettings.body, daily_cap: 10 })
  const { sent, send } = mailer()
  const o = await sendOne(D(db), 'p1', { send, enabled: true })
  assert.equal(o.reason, 'edited-since-approval')
  assert.equal(sent.length, 0)
})

test('withdrawing an approval returns it to drafted', async () => {
  const db = await approvedDb()
  await unapprove(D(db), 'p1')
  assert.equal(db.tables.university_prospects[0].status, 'drafted')
})

test('a failed send puts the message back to approved so it can be retried', async () => {
  const db = await approvedDb()
  const o = await sendOne(D(db), 'p1', { send: async () => { throw new Error('Resend is down') }, enabled: true })
  assert.equal(o.sent, false)
  assert.match(o.message ?? '', /Resend is down/)
  const row = db.tables.university_prospects[0]
  assert.equal(row.status, 'approved')
  assert.equal(row.sent_at, null)
})

test('two overlapping sends cannot both mail: the second finds the row already claimed', async () => {
  const db = await approvedDb()
  const { sent, send } = mailer()
  const [a, b] = await Promise.all([sendOne(D(db), 'p1', { send, enabled: true }), sendOne(D(db), 'p1', { send, enabled: true })])
  assert.equal([a, b].filter(o => o.sent).length, 1)
  assert.equal(sent.length, 1)
})

test('the daily cap stops a bulk send partway, and says so', async () => {
  const db = fakeDb({
    prospects: [prospect(), prospect({ id: 'p2', slug: 'b', name: 'B U', contact_email: 'b@b.edu' }), prospect({ id: 'p3', slug: 'c', name: 'C U', contact_email: 'c@c.edu' })],
    settings: [{ ...goodSettings, daily_cap: 2 }],
  })
  await draftAll(D(db))
  for (const p of db.tables.university_prospects) await approve(D(db), p.id)
  const { sent, send } = mailer()
  const r = await sendApproved(D(db), { send, enabled: true, pauseMs: 0 })
  assert.equal(r.sent, 2)
  assert.equal(r.remaining, 0, 'the third was attempted and refused by the cap, not skipped')
  assert.equal(sent.length, 2)
  assert.equal(r.outcomes.at(-1)?.reason, 'daily-cap-reached')
  assert.equal(db.tables.university_prospects.filter(p => p.status === 'approved').length, 1, 'the third waits for tomorrow')
})

test('an address that said no is never written to again, even under another entry', async () => {
  const db = fakeDb({
    prospects: [prospect({ status: 'sent' }), prospect({ id: 'p2', slug: 'twin', name: 'Twin U', status: 'drafted', subject: 's', body: 'b' })],
    settings: [{ ...goodSettings }],
  })
  await markOutcome(D(db), 'p1', 'declined', 'not interested')
  assert.deepEqual(db.tables.outreach_suppressions.map(s => s.email), ['exchange@example.edu'])
  assert.equal(db.tables.university_prospects[0].status, 'declined')
  await approve(D(db), 'p2')
  const { sent, send } = mailer()
  const o = await sendOne(D(db), 'p2', { send, enabled: true })
  assert.equal(o.reason, 'suppressed')
  assert.equal(sent.length, 0)
})

test('an address already emailed under another entry is not emailed again', async () => {
  const db = fakeDb({
    prospects: [prospect({ status: 'sent', sent_at: '2026-11-02T10:00:00Z' }), prospect({ id: 'p2', slug: 'twin', name: 'Twin U', status: 'drafted', subject: 's', body: 'b' })],
    settings: [{ ...goodSettings }],
  })
  await approve(D(db), 'p2')
  const { send } = mailer()
  assert.equal((await sendOne(D(db), 'p2', { send, enabled: true })).reason, 'address-already-emailed')
})

test('a test goes only to the address given, is marked as a test, and changes nothing', async () => {
  const db = await approvedDb()
  const { sent, send } = mailer()
  const e = await testSend(D(db), 'p1', { to: 'admin@example.com', send })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'admin@example.com')
  assert.match(sent[0].subject, /^\[TEST → exchange@example\.edu\] /)
  assert.equal(sent[0].from, 'Hugo from Wroomly <hugo@wroomly.app>', 'the test shows the real sender')
  assert.equal(e.to, 'admin@example.com')
  assert.equal(db.tables.university_prospects[0].status, 'approved', 'a test neither sends nor un-approves')
})

// ── approve all ─────────────────────────────────────────────────────────────

const threeDrafted = () => fakeDb({
  prospects: [
    prospect({ id: 'p1', slug: 'a', name: 'A U', contact_email: 'a@a.edu' }),
    prospect({ id: 'p2', slug: 'b', name: 'B U', contact_email: 'b@b.edu' }),
    prospect({ id: 'p3', slug: 'c', name: 'C U', contact_email: null, confidence: 'not_found' }),
  ],
  settings: [{ ...goodSettings }],
})

test('approve all approves every drafted message, each bound to its own text', async () => {
  const db = threeDrafted()
  await draftAll(D(db))
  const r = await approveAll(D(db))
  assert.deepEqual(r, { approved: 2, skipped: 0 })
  const [a, b, c] = db.tables.university_prospects
  assert.equal(a.status, 'approved')
  assert.equal(b.status, 'approved')
  assert.equal(c.status, 'researched', 'no address, so never drafted and never approved')
  assert.notEqual(a.approval_hash, b.approval_hash, 'a hash per message, not one shared approval')
})

test('approve all still lets each message be voided by an edit, and still gates the send', async () => {
  const db = threeDrafted()
  await draftAll(D(db))
  await approveAll(D(db))
  await saveDraft(D(db), 'p1', { subject: 'Changed after approving', body: 'Changed' })
  assert.equal(db.tables.university_prospects[0].status, 'drafted', 'edited → approval gone')
  const { sent, send } = mailer()
  assert.equal((await sendOne(D(db), 'p1', { send, enabled: true })).reason, 'not-approved')
  assert.equal((await sendOne(D(db), 'p2', { send, enabled: true })).sent, true, 'the untouched one is fine')
  assert.equal(sent.length, 1)
})

test('approve all refuses outright without a valid sender, approving nothing', async () => {
  const db = fakeDb({ prospects: [prospect()], settings: [{ ...goodSettings, reply_to: '' }] })
  await draftAll(D(db))
  await assert.rejects(approveAll(D(db)), /Reply-to is not set/)
  assert.equal(db.tables.university_prospects[0].status, 'drafted')
})

test('approve all leaves sent, declined and already-approved messages alone', async () => {
  const db = fakeDb({
    prospects: [
      prospect({ id: 's', slug: 's', name: 'S U', contact_email: 's@s.edu', status: 'sent', subject: 's', body: 'b' }),
      prospect({ id: 'd', slug: 'd', name: 'D U', contact_email: 'd@d.edu', status: 'declined', subject: 's', body: 'b' }),
      prospect({ id: 'x', slug: 'x', name: 'X U', contact_email: 'x@x.edu', status: 'approved', subject: 's', body: 'b', approval_hash: 'keep-me' }),
    ],
    settings: [{ ...goodSettings }],
  })
  assert.deepEqual(await approveAll(D(db)), { approved: 0, skipped: 0 })
  assert.deepEqual(db.tables.university_prospects.map(p => p.status), ['sent', 'declined', 'approved'])
  assert.equal(db.tables.university_prospects[2].approval_hash, 'keep-me')
})

// ── template test ───────────────────────────────────────────────────────────

test('the template test goes only to the address given, from the real sender, and changes nothing', async () => {
  const db = threeDrafted()
  const before = JSON.stringify(db.tables.university_prospects)
  const { sent, send } = mailer()
  const r = await testTemplate(D(db), { to: 'admin@example.com', send })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'admin@example.com')
  assert.equal(sent[0].from, 'Hugo from Wroomly <hugo@wroomly.app>')
  assert.equal(sent[0].replyTo, 'me@example.com')
  assert.match(sent[0].subject, /^\[TEST TEMPLATE → A U\] Housing for A U students$/)
  assert.match(sent[0].text, /^Dear Exchange Office,/)
  assert.equal(r.university, 'A U')
  assert.equal(JSON.stringify(db.tables.university_prospects), before, 'no row changed')
})

test('the template test refuses without a reply-to, and mails no one', async () => {
  const db = fakeDb({ prospects: [prospect()], settings: [{ ...goodSettings, reply_to: '' }] })
  const { sent, send } = mailer()
  await assert.rejects(testTemplate(D(db), { to: 'admin@example.com', send }), /Reply-to is not set/)
  assert.equal(sent.length, 0)
})

test('a bulk send stops starting new sends when its time budget is spent, and says how many are left', async () => {
  const db = fakeDb({
    prospects: [1, 2, 3, 4].map(n => prospect({ id: `p${n}`, slug: `u${n}`, name: `U${n}`, contact_email: `u${n}@u${n}.edu` })),
    settings: [{ ...goodSettings }],
  })
  await draftAll(D(db))
  for (const p of db.tables.university_prospects) await approve(D(db), p.id)
  const { sent, send } = mailer()
  let clock = 0
  // every send "takes" 20s of the budget
  const slow: MailSender = async m => { clock += 20_000; return send(m) }
  const r = await sendApproved(D(db), { send: slow, enabled: true, pauseMs: 0, budgetMs: 45_000, now: () => clock })
  assert.equal(sent.length, 3, 'starts at 0s, 20s and 40s; at 60s it is out of budget')
  assert.equal(r.sent, 3)
  assert.equal(r.remaining, 1)
  assert.equal(db.tables.university_prospects.filter(p => p.status === 'approved').length, 1, 'the unsent one is still approved, not lost')

  // clicking again carries on and finishes
  clock = 0
  const again = await sendApproved(D(db), { send, enabled: true, pauseMs: 0, now: () => clock })
  assert.equal(again.sent, 1)
  assert.equal(again.remaining, 0)
  assert.equal(sent.length, 4)
})
