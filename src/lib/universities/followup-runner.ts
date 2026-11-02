import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../agents/outreach-policy.ts'
import { countSentLastDay, loadSettings, type MailSender, type Prospect, type Settings } from './runner.ts'
import { formatFrom, senderProblems, type Envelope } from './gate.ts'
import {
  FOLLOWUP_MIN_DAYS,
  FOLLOWUP_REFUSAL_TEXT,
  checkFollowupSend,
  daysSince,
  followupApprovalHash,
  followupState,
  isFollowupDue,
  renderFollowup,
  type FollowupRefusal,
  type FollowupState,
} from './followup.ts'

type Db = SupabaseClient

/** The envelope of the FOLLOW-UP, as it would go out right now. */
export function followupEnvelope(p: Prospect, s: Settings): Envelope {
  return {
    from: formatFrom(s.from_name, s.from_email),
    to: p.contact_email ?? '',
    replyTo: s.reply_to,
    subject: p.followup_subject ?? '',
    body: p.followup_body ?? '',
  }
}

async function getProspect(db: Db, id: string): Promise<Prospect> {
  const { data, error } = await db.from('university_prospects').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('University not found.')
  return data as Prospect
}

export interface FollowupItem {
  id: string
  name: string
  country: string | null
  email: string | null
  sentAt: string
  daysSince: number
  due: boolean
  state: FollowupState
}

export interface FollowupOverview {
  items: FollowupItem[]
  due: number
  waiting: number
  minDays: number
}

/**
 * Every university we have emailed that has not replied, said no, or been
 * followed up — with whether its follow-up is due yet and how far along it is.
 * Computed here (not in the page) so "now" is read in one place.
 */
export async function loadFollowupOverview(db: Db, now = new Date()): Promise<FollowupOverview> {
  const { data, error } = await db.from('university_prospects').select('*').eq('status', 'sent').order('sent_at', { ascending: true })
  if (error) throw new Error(error.message)
  const items: FollowupItem[] = []
  for (const p of (data ?? []) as Prospect[]) {
    if (p.followup_sent_at || !p.sent_at) continue
    items.push({
      id: p.id,
      name: p.name,
      country: p.country,
      email: p.contact_email,
      sentAt: p.sent_at,
      daysSince: daysSince(p.sent_at, now) ?? 0,
      due: isFollowupDue({ status: p.status, sent_at: p.sent_at, followup_sent_at: p.followup_sent_at ?? null }, now),
      state: followupState({ followup_subject: p.followup_subject ?? null, followup_approval_hash: p.followup_approval_hash ?? null, followup_sent_at: p.followup_sent_at ?? null }),
    })
  }
  const due = items.filter(i => i.due).length
  return { items, due, waiting: items.length - due, minDays: FOLLOWUP_MIN_DAYS }
}

export interface DraftFollowupsResult {
  drafted: number
  skipped: number
}

/** Write the follow-up text for every university that is due and has none yet.
 *  `redraft` rewrites unapproved follow-up drafts from the current wording. */
export async function draftFollowups(db: Db, { redraft = false, now = new Date() }: { redraft?: boolean; now?: Date } = {}): Promise<DraftFollowupsResult> {
  const { data, error } = await db.from('university_prospects').select('*').eq('status', 'sent')
  if (error) throw new Error(error.message)
  const r: DraftFollowupsResult = { drafted: 0, skipped: 0 }
  for (const p of (data ?? []) as Prospect[]) {
    if (!p.sent_at || !isFollowupDue({ status: p.status, sent_at: p.sent_at, followup_sent_at: p.followup_sent_at ?? null }, now)) continue
    const state = followupState({ followup_subject: p.followup_subject ?? null, followup_approval_hash: p.followup_approval_hash ?? null, followup_sent_at: p.followup_sent_at ?? null })
    if (state === 'approved' || (state === 'drafted' && !redraft)) { r.skipped++; continue }
    if (!p.contact_email) { r.skipped++; continue }
    const email = renderFollowup(p, p.sent_at)
    const { error: upErr } = await db
      .from('university_prospects')
      .update({ followup_subject: email.subject, followup_body: email.body, followup_approved_at: null, followup_approval_hash: null })
      .eq('id', p.id)
    if (upErr) throw new Error(upErr.message)
    r.drafted++
  }
  return r
}

/** Save an edit to a follow-up. Any edit voids its approval. */
export async function saveFollowup(db: Db, id: string, edit: { subject: string; body: string }): Promise<void> {
  const p = await getProspect(db, id)
  if (p.status !== 'sent' || p.followup_sent_at) throw new Error('This follow-up can no longer be edited.')
  const { error } = await db
    .from('university_prospects')
    .update({ followup_subject: edit.subject, followup_body: edit.body, followup_approved_at: null, followup_approval_hash: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export interface ApproveFollowupsResult {
  approved: number
  skipped: number
}

/** Approve follow-up drafts (all, or just `only`). Same discipline as the
 *  first email: each is bound to its own exact text. */
export async function approveFollowups(db: Db, only?: string[]): Promise<ApproveFollowupsResult> {
  const s = await loadSettings(db)
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  const { data, error } = await db.from('university_prospects').select('*').eq('status', 'sent')
  if (error) throw new Error(error.message)
  const chosen = only ? new Set(only) : null
  const r: ApproveFollowupsResult = { approved: 0, skipped: 0 }
  for (const p of ((data ?? []) as Prospect[]).filter(p => !chosen || chosen.has(p.id))) {
    if (p.followup_sent_at || p.followup_approval_hash) continue
    if (!p.contact_email || !p.followup_subject?.trim() || !p.followup_body?.trim()) { r.skipped++; continue }
    const { error: upErr } = await db
      .from('university_prospects')
      .update({ followup_approved_at: new Date().toISOString(), followup_approval_hash: followupApprovalHash(followupEnvelope(p, s)) })
      .eq('id', p.id)
      .eq('status', 'sent')
    if (upErr) throw new Error(upErr.message)
    r.approved++
  }
  return r
}

export async function withdrawFollowups(db: Db, ids: string[]): Promise<number> {
  let n = 0
  for (const id of new Set(ids)) {
    const { data, error } = await db
      .from('university_prospects')
      .update({ followup_approved_at: null, followup_approval_hash: null })
      .eq('id', id)
      .eq('status', 'sent')
      .select('id')
    if (error) throw new Error(error.message)
    n += data?.length ?? 0
  }
  return n
}

export interface FollowupOutcome {
  id: string
  name: string
  sent: boolean
  reason?: FollowupRefusal
  message?: string
}

async function sendContext(db: Db) {
  const [supp, recent] = await Promise.all([db.from('outreach_suppressions').select('email'), countSentLastDay(db)])
  return {
    suppressed: new Set(((supp.data ?? []) as { email: string }[]).map(r => normalizeEmail(r.email))),
    sentInLastDay: recent,
  }
}

export async function sendFollowup(
  db: Db,
  id: string,
  { send, enabled, now = new Date() }: { send: MailSender; enabled: boolean; now?: Date },
  ctxIn?: Awaited<ReturnType<typeof sendContext>>,
): Promise<FollowupOutcome> {
  const [p, s, ctx] = await Promise.all([getProspect(db, id), loadSettings(db), ctxIn ?? sendContext(db)])
  const envelope = followupEnvelope(p, s)
  const v = checkFollowupSend({
    status: p.status,
    sentAt: p.sent_at,
    followupSentAt: p.followup_sent_at ?? null,
    contactEmail: p.contact_email,
    approvalHash: p.followup_approval_hash ?? null,
    envelope,
    now,
    suppressed: ctx.suppressed,
    sentInLastDay: ctx.sentInLastDay,
    dailyCap: s.daily_cap,
    enabled,
    sender: s,
  })
  if (!v.ok) return { id, name: p.name, sent: false, reason: v.reason, message: FOLLOWUP_REFUSAL_TEXT[v.reason] }

  // Claim the row BEFORE mailing, only if no follow-up has been recorded:
  // two overlapping requests can then never both send.
  const { data: claimed } = await db
    .from('university_prospects')
    .update({ followup_sent_at: now.toISOString() })
    .eq('id', id)
    .is('followup_sent_at', null)
    .select('id')
  if (!claimed?.length) return { id, name: p.name, sent: false, reason: 'followup-already-sent', message: FOLLOWUP_REFUSAL_TEXT['followup-already-sent'] }

  try {
    const res = await send({ from: envelope.from, to: envelope.to, replyTo: envelope.replyTo, subject: envelope.subject, text: envelope.body })
    await db
      .from('university_prospects')
      .update({ followup_message_id: res.id ?? null, followup_snapshot: { ...envelope, sentAt: now.toISOString() } })
      .eq('id', id)
    ctx.sentInLastDay++
    return { id, name: p.name, sent: true }
  } catch (err) {
    await db.from('university_prospects').update({ followup_sent_at: null }).eq('id', id)
    return { id, name: p.name, sent: false, message: err instanceof Error ? err.message : 'Send failed.' }
  }
}

export interface SendFollowupsResult {
  outcomes: FollowupOutcome[]
  sent: number
  remaining: number
}

/** Send approved follow-ups, oldest first, within the daily cap and a time
 *  budget (the request is killed at 60s; a row is claimed before it is mailed). */
export async function sendApprovedFollowups(
  db: Db,
  opts: { send: MailSender; enabled: boolean; now?: Date; pauseMs?: number; budgetMs?: number; clock?: () => number },
): Promise<SendFollowupsResult> {
  const { pauseMs = 700, budgetMs = 45_000, clock = Date.now } = opts
  const { data } = await db.from('university_prospects').select('id').eq('status', 'sent').order('sent_at', { ascending: true })
  const { data: full } = await db.from('university_prospects').select('id, followup_approval_hash, followup_sent_at').eq('status', 'sent')
  const approved = new Set(((full ?? []) as { id: string; followup_approval_hash: string | null; followup_sent_at: string | null }[]).filter(r => r.followup_approval_hash && !r.followup_sent_at).map(r => r.id))
  const ids = ((data ?? []) as { id: string }[]).map(r => r.id).filter(id => approved.has(id))
  const ctx = await sendContext(db)
  const started = clock()
  const outcomes: FollowupOutcome[] = []
  for (const id of ids) {
    if (clock() - started > budgetMs) break
    const o = await sendFollowup(db, id, opts, ctx)
    outcomes.push(o)
    if (o.reason === 'daily-cap-reached' || o.reason === 'sending-disabled' || o.reason === 'sender-misconfigured') break
    if (o.sent && pauseMs > 0) await new Promise(r => setTimeout(r, pauseMs))
  }
  return { outcomes, sent: outcomes.filter(o => o.sent).length, remaining: ids.length - outcomes.length }
}

/** Mail one follow-up draft to the admin's own address. Changes nothing. */
export async function testFollowup(db: Db, id: string, { to, send }: { to: string; send: MailSender }): Promise<Envelope> {
  const [p, s] = await Promise.all([getProspect(db, id), loadSettings(db)])
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  if (!p.followup_subject?.trim() || !p.followup_body?.trim()) throw new Error('Draft the follow-up first.')
  const e = followupEnvelope(p, s)
  const preview: Envelope = { ...e, to, subject: `[TEST FOLLOW-UP → ${p.contact_email ?? 'no address'}] ${e.subject}` }
  await send({ from: preview.from, to, replyTo: preview.replyTo, subject: preview.subject, text: preview.body })
  return preview
}
