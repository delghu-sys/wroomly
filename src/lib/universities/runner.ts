import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../agents/outreach-policy.ts'
import { DEFAULT_SETTINGS, renderEmail } from './template.ts'
import {
  REFUSAL_TEXT,
  approvalHash,
  checkSend,
  formatFrom,
  senderProblems,
  type Envelope,
  type ProspectStatus,
  type SendRefusal,
} from './gate.ts'

/**
 * The partner-university pipeline against the database.
 *
 *   researched → drafted → approved → sent → replied | declined
 *
 * Every transition a person must be part of (approve, send) is a separate
 * call, and `sendOne` re-checks everything through `checkSend` — it never
 * trusts that an earlier step happened.
 */

type Db = SupabaseClient

export interface Settings {
  from_name: string
  from_email: string
  reply_to: string
  subject: string
  body: string
  daily_cap: number
}

export interface Prospect {
  id: string
  slug: string
  name: string
  country: string | null
  city: string | null
  website: string | null
  umich_units: string[]
  evidence_url: string | null
  office_name: string | null
  office_page_url: string | null
  contact_email: string | null
  contact_email_source_url: string | null
  contact_kind: 'office' | 'named' | null
  contact_name: string | null
  contact_form_url: string | null
  phone: string | null
  confidence: 'verified' | 'likely' | 'not_found'
  notes: string | null
  status: ProspectStatus
  subject: string | null
  body: string | null
  approved_at: string | null
  approval_hash: string | null
  sent_at: string | null
  sent_message_id: string | null
  sent_snapshot: (Envelope & { sentAt: string }) | null
  replied_at: string | null
  reply_note: string | null
  created_at: string
}

export type MailSender = (m: {
  from: string
  to: string
  replyTo: string
  subject: string
  text: string
}) => Promise<{ id?: string }>

export async function loadSettings(db: Db): Promise<Settings> {
  const { data } = await db.from('partner_outreach_settings').select('*').eq('id', 'default').maybeSingle()
  return { ...DEFAULT_SETTINGS, ...((data as Partial<Settings> | null) ?? {}) }
}

export async function saveSettings(db: Db, s: Settings): Promise<void> {
  const { error } = await db.from('partner_outreach_settings').upsert({ id: 'default', ...s })
  if (error) throw new Error(error.message)
}

export function envelopeFor(p: Pick<Prospect, 'contact_email' | 'subject' | 'body'>, s: Settings): Envelope {
  return {
    from: formatFrom(s.from_name, s.from_email),
    to: p.contact_email ?? '',
    replyTo: s.reply_to,
    subject: p.subject ?? '',
    body: p.body ?? '',
  }
}

async function getProspect(db: Db, id: string): Promise<Prospect> {
  const { data, error } = await db.from('university_prospects').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('University not found.')
  return data as Prospect
}

// ── drafting ────────────────────────────────────────────────────────────────

export interface DraftAllResult {
  drafted: number
  skippedNoEmail: number
  untouched: number
}

/** Fill subject + body from the template for every researched prospect that
 *  has an address. Never touches one already approved or sent. */
export async function draftAll(db: Db, { redraft = false }: { redraft?: boolean } = {}): Promise<DraftAllResult> {
  const settings = await loadSettings(db)
  const { data, error } = await db.from('university_prospects').select('*')
  if (error) throw new Error(error.message)

  const r: DraftAllResult = { drafted: 0, skippedNoEmail: 0, untouched: 0 }
  for (const p of (data ?? []) as Prospect[]) {
    const eligible = p.status === 'researched' || (redraft && p.status === 'drafted')
    if (!eligible) { r.untouched++; continue }
    if (!p.contact_email) { r.skippedNoEmail++; continue }
    const email = renderEmail(p, settings)
    const { error: upErr } = await db
      .from('university_prospects')
      .update({ subject: email.subject, body: email.body, status: 'drafted', approved_at: null, approval_hash: null })
      .eq('id', p.id)
    if (upErr) throw new Error(upErr.message)
    r.drafted++
  }
  return r
}

/** Save an edit. Any edit voids a previous approval. */
export async function saveDraft(
  db: Db,
  id: string,
  edit: { subject: string; body: string; contact_email?: string | null },
): Promise<void> {
  const p = await getProspect(db, id)
  if (p.status === 'sent' || p.status === 'replied' || p.status === 'declined')
    throw new Error('This message has already been sent — it can no longer be edited.')
  const patch: Record<string, unknown> = {
    subject: edit.subject,
    body: edit.body,
    status: 'drafted',
    approved_at: null,
    approval_hash: null,
  }
  if (edit.contact_email !== undefined) patch.contact_email = edit.contact_email?.trim().toLowerCase() || null
  const { error } = await db.from('university_prospects').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

// ── approval ────────────────────────────────────────────────────────────────

export async function approve(db: Db, id: string): Promise<void> {
  const [p, s] = await Promise.all([getProspect(db, id), loadSettings(db)])
  if (p.status !== 'drafted' && p.status !== 'approved') throw new Error('Only a drafted message can be approved.')
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  if (!p.contact_email) throw new Error('This university has no contact email.')
  if (!p.subject?.trim() || !p.body?.trim()) throw new Error('The subject or body is empty.')

  const { error } = await db
    .from('university_prospects')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approval_hash: approvalHash(envelopeFor(p, s)) })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export interface ApproveAllResult {
  approved: number
  skipped: number
}

/**
 * Approve every drafted message that has an address and text.
 *
 * This is the same approval as the single button — each row gets its own hash
 * of its own To/From/Reply-to/subject/body — so editing any of them afterwards
 * still voids that approval. What it removes is the clicking, not the check.
 * Refuses outright if the sender setup is not valid, rather than approving
 * messages that could never be sent.
 */
export async function approveAll(db: Db): Promise<ApproveAllResult> {
  const s = await loadSettings(db)
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])

  const { data, error } = await db.from('university_prospects').select('*').eq('status', 'drafted')
  if (error) throw new Error(error.message)

  const r: ApproveAllResult = { approved: 0, skipped: 0 }
  for (const p of (data ?? []) as Prospect[]) {
    if (!p.contact_email || !p.subject?.trim() || !p.body?.trim()) { r.skipped++; continue }
    const { error: upErr } = await db
      .from('university_prospects')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approval_hash: approvalHash(envelopeFor(p, s)) })
      .eq('id', p.id)
      .eq('status', 'drafted')
    if (upErr) throw new Error(upErr.message)
    r.approved++
  }
  return r
}

export async function unapprove(db: Db, id: string): Promise<void> {
  const p = await getProspect(db, id)
  if (p.status !== 'approved') return
  const { error } = await db
    .from('university_prospects')
    .update({ status: 'drafted', approved_at: null, approval_hash: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── sending ─────────────────────────────────────────────────────────────────

export interface SendOutcome {
  id: string
  name: string
  sent: boolean
  reason?: SendRefusal
  message?: string
}

/** Sends in the trailing 24 hours — the window the daily cap is counted over. */
export async function countSentLastDay(db: Db): Promise<number> {
  const { count } = await db
    .from('university_prospects')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', new Date(Date.now() - 24 * 3600_000).toISOString())
  return count ?? 0
}

async function sendContext(db: Db) {
  const [suppRes, emailedRes, recentRes] = await Promise.all([
    db.from('outreach_suppressions').select('email'),
    db.from('university_prospects').select('contact_email').not('sent_at', 'is', null),
    db
      .from('university_prospects')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', new Date(Date.now() - 24 * 3600_000).toISOString()),
  ])
  return {
    suppressed: new Set(((suppRes.data ?? []) as { email: string }[]).map(r => normalizeEmail(r.email))),
    alreadyEmailed: new Set(
      ((emailedRes.data ?? []) as { contact_email: string | null }[]).map(r => normalizeEmail(r.contact_email)).filter(Boolean),
    ),
    sentInLastDay: recentRes.count ?? 0,
  }
}

export async function sendOne(
  db: Db,
  id: string,
  { send, enabled }: { send: MailSender; enabled: boolean },
  ctxIn?: Awaited<ReturnType<typeof sendContext>>,
): Promise<SendOutcome> {
  const [p, s, ctx] = await Promise.all([getProspect(db, id), loadSettings(db), ctxIn ?? sendContext(db)])
  const envelope = envelopeFor(p, s)

  const verdict = checkSend({
    status: p.status,
    contactEmail: p.contact_email,
    confidence: p.confidence,
    approvalHash: p.approval_hash,
    envelope,
    suppressed: ctx.suppressed,
    alreadyEmailed: ctx.alreadyEmailed,
    sentInLastDay: ctx.sentInLastDay,
    dailyCap: s.daily_cap,
    enabled,
    sender: s,
  })
  if (!verdict.ok) return { id, name: p.name, sent: false, reason: verdict.reason, message: REFUSAL_TEXT[verdict.reason] }

  // Claim the row BEFORE mailing so two overlapping requests cannot both send.
  const { data: claimed } = await db
    .from('university_prospects')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'approved')
    .select('id')
  if (!claimed?.length) return { id, name: p.name, sent: false, reason: 'already-sent', message: REFUSAL_TEXT['already-sent'] }

  try {
    const res = await send({ from: envelope.from, to: envelope.to, replyTo: envelope.replyTo, subject: envelope.subject, text: envelope.body })
    const sentAt = new Date().toISOString()
    await db
      .from('university_prospects')
      .update({ sent_at: sentAt, sent_message_id: res.id ?? null, sent_snapshot: { ...envelope, sentAt } })
      .eq('id', id)
    ctx.sentInLastDay++
    ctx.alreadyEmailed.add(normalizeEmail(envelope.to))
    return { id, name: p.name, sent: true }
  } catch (err) {
    // Not sent after all: put it back so it can be retried, and say why.
    await db
      .from('university_prospects')
      .update({ status: 'approved', sent_at: null })
      .eq('id', id)
    return { id, name: p.name, sent: false, message: err instanceof Error ? err.message : 'Send failed.' }
  }
}

/** Send every approved message, oldest approval first, until the cap. */
export async function sendApproved(
  db: Db,
  opts: { send: MailSender; enabled: boolean },
): Promise<{ outcomes: SendOutcome[]; sent: number }> {
  const { data } = await db
    .from('university_prospects')
    .select('id')
    .eq('status', 'approved')
    .order('approved_at', { ascending: true })
  const ctx = await sendContext(db)
  const outcomes: SendOutcome[] = []
  for (const { id } of (data ?? []) as { id: string }[]) {
    const o = await sendOne(db, id, opts, ctx)
    outcomes.push(o)
    if (o.reason === 'daily-cap-reached' || o.reason === 'sending-disabled' || o.reason === 'sender-misconfigured') break
    if (o.sent) await new Promise(r => setTimeout(r, 1500))
  }
  return { outcomes, sent: outcomes.filter(o => o.sent).length }
}

/** Mail the draft to the admin's own address. Changes nothing in the table. */
export async function testSend(db: Db, id: string, { to, send }: { to: string; send: MailSender }): Promise<Envelope> {
  const [p, s] = await Promise.all([getProspect(db, id), loadSettings(db)])
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  if (!p.subject?.trim() || !p.body?.trim()) throw new Error('Draft the message first.')
  const e = envelopeFor(p, s)
  const preview: Envelope = { ...e, to, subject: `[TEST → ${p.contact_email ?? 'no address'}] ${e.subject}` }
  await send({ from: preview.from, to, replyTo: preview.replyTo, subject: preview.subject, text: preview.body })
  return preview
}

/**
 * Mail the TEMPLATE to the admin's own address, filled in for one real
 * university (the first with an address and a Michigan program) — so the
 * layout, sender and reply-to can be checked in a real inbox before opening
 * any single university. Uses the SAVED settings, and changes nothing.
 */
export async function testTemplate(db: Db, { to, send }: { to: string; send: MailSender }): Promise<{ envelope: Envelope; university: string }> {
  const s = await loadSettings(db)
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  const { data } = await db.from('university_prospects').select('*').not('contact_email', 'is', null).order('name', { ascending: true })
  const rows = (data ?? []) as Prospect[]
  const sample = rows.find(p => p.umich_units.length > 0) ?? rows[0]
  if (!sample) throw new Error('No university with an email address yet.')
  const email = renderEmail(sample, s)
  const envelope: Envelope = {
    from: formatFrom(s.from_name, s.from_email),
    to,
    replyTo: s.reply_to,
    subject: `[TEST TEMPLATE → ${sample.name}] ${email.subject}`,
    body: email.body,
  }
  await send({ from: envelope.from, to, replyTo: envelope.replyTo, subject: envelope.subject, text: envelope.body })
  return { envelope, university: sample.name }
}

// ── outcomes ────────────────────────────────────────────────────────────────

export async function markOutcome(
  db: Db,
  id: string,
  outcome: 'replied' | 'declined' | 'skipped' | 'researched',
  note?: string,
): Promise<void> {
  const p = await getProspect(db, id)
  const patch: Record<string, unknown> = { status: outcome, reply_note: note?.trim() || null }
  if (outcome === 'replied') patch.replied_at = new Date().toISOString()
  if (outcome === 'researched') Object.assign(patch, { subject: null, body: null, approved_at: null, approval_hash: null })
  const { error } = await db.from('university_prospects').update(patch).eq('id', id)
  if (error) throw new Error(error.message)

  // "No thanks" means never again, even if the entry is re-imported.
  if (outcome === 'declined' && p.contact_email) {
    await db
      .from('outreach_suppressions')
      .upsert({ email: normalizeEmail(p.contact_email), reason: 'manual' }, { onConflict: 'email', ignoreDuplicates: true })
  }
}
