import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../agents/outreach-policy.ts'
import { loadSettings } from './runner.ts'
import { formatFrom, senderProblems } from './gate.ts'
import type { DrafterInput, DraftOutput } from './reply-drafter.ts'
import { toPrepared } from './reply-drafter.ts'
import {
  REPLY_REFUSAL_TEXT,
  checkReplySend,
  classifyInbound,
  holdUntil,
  matchProspect,
  replyApprovalHash,
  replySubject,
  stripQuoted,
  suggestSendTime,
  type MessageKind,
  type ReplyEnvelope,
  type ReplyRefusal,
} from './replies.ts'

type Db = SupabaseClient

export interface InboundInput {
  source: 'gmail' | 'resend_inbound' | 'manual'
  /** The id THERE (Gmail message id, Resend email id). With `source` it is the
   *  dedupe key, so ingesting the same message twice does nothing. */
  externalId: string
  messageIdHeader?: string | null
  inReplyTo?: string | null
  from: string
  fromName?: string | null
  to?: string | null
  subject?: string | null
  body?: string | null
  receivedAt: string
}

export interface IngestOutcome {
  externalId: string
  duplicate: boolean
  kind?: MessageKind
  reason?: string
  university?: string | null
  matched?: 'address' | 'domain' | 'ambiguous' | 'none'
  /** What was done to the university's status, in words. */
  effect?: string
}

interface ProspectRow {
  id: string
  name: string
  country: string | null
  contact_email: string | null
  status: string
}

/**
 * Take in messages from any source (Gmail sync, Resend inbound, a manual paste)
 * and apply the safe, mechanical consequences — and ONLY those:
 *
 *   opt-out     → the university is marked declined and the address suppressed,
 *                 immediately. Our own email promised "reply and I won't write
 *                 again"; honouring that must not wait for a person.
 *   auto-reply  → noted, and the follow-up is held back (some say "do not
 *                 follow up"). Nothing to answer.
 *   bounce      → noted. Nothing to answer.
 *   a person    → the university is marked replied, and it lands in the inbox
 *                 for you, with the best time to answer.
 *
 * Nothing is ever SENT from here.
 */
export async function ingestMessages(db: Db, inputs: InboundInput[], { now = new Date() }: { now?: Date } = {}): Promise<IngestOutcome[]> {
  const { data: pData, error: pErr } = await db.from('university_prospects').select('id, name, country, contact_email, status')
  if (pErr) throw new Error(pErr.message)
  const prospects = (pData ?? []) as ProspectRow[]
  const out: IngestOutcome[] = []

  for (const m of inputs) {
    const { data: existing } = await db.from('university_messages').select('id').eq('source', m.source).eq('external_id', m.externalId).limit(1)
    if (existing?.length) { out.push({ externalId: m.externalId, duplicate: true }); continue }

    const cls = classifyInbound({ from: m.from, subject: m.subject ?? null, body: m.body ?? null })
    const match = matchProspect(m.from, prospects)
    const prospect = match.prospect ? prospects.find(p => p.id === match.prospect!.id) ?? null : null
    const automatic = cls.kind !== 'human_reply'
    const send = cls.kind === 'human_reply' ? suggestSendTime(prospect?.country ?? null, now) : null

    const { error } = await db.from('university_messages').insert({
      prospect_id: prospect?.id ?? null,
      source: m.source,
      external_id: m.externalId,
      message_id_header: m.messageIdHeader ?? null,
      in_reply_to: m.inReplyTo ?? null,
      from_email: normalizeEmail(m.from),
      from_name: m.fromName ?? null,
      to_email: m.to ?? null,
      subject: m.subject ?? null,
      body_text: (m.body ?? '').slice(0, 20_000),
      received_at: m.receivedAt,
      kind: cls.kind,
      kind_reason: cls.reason,
      hold_followup_until: cls.kind === 'auto_reply' && cls.holdDays ? holdUntil(m.receivedAt, cls.holdDays) : null,
      // Automatic messages are finished the moment they are understood; only a
      // person's reply waits for a person.
      status: automatic ? 'handled' : 'new',
      suggested_send_at: send?.at ?? null,
      suggested_send_note: send?.note ?? null,
    })
    if (error) throw new Error(error.message)

    let effect = ''
    if (cls.kind === 'opt_out') {
      const emails = new Set([normalizeEmail(m.from), prospect?.contact_email ? normalizeEmail(prospect.contact_email) : ''].filter(Boolean))
      for (const email of emails) {
        await db.from('outreach_suppressions').upsert({ email, reason: 'manual' }, { onConflict: 'email', ignoreDuplicates: true })
      }
      effect = `suppressed ${[...emails].join(', ')}`
      if (prospect && prospect.status !== 'declined') {
        await db.from('university_prospects').update({ status: 'declined', reply_note: `Asked to stop: ${cls.reason}` }).eq('id', prospect.id)
        effect += '; university marked declined'
      }
    } else if (cls.kind === 'human_reply' && prospect && prospect.status === 'sent') {
      await db.from('university_prospects').update({ status: 'replied', replied_at: m.receivedAt }).eq('id', prospect.id)
      effect = 'university marked replied'
    } else if (cls.kind === 'auto_reply') {
      effect = `follow-up held for ${cls.holdDays} days`
    }

    out.push({ externalId: m.externalId, duplicate: false, kind: cls.kind, reason: cls.reason, university: prospect?.name ?? null, matched: match.how, effect })
  }
  return out
}

// ── the inbox, for the dashboard ────────────────────────────────────────────

export interface InboxMessage {
  id: string
  prospectId: string | null
  university: string | null
  country: string | null
  fromEmail: string
  fromName: string | null
  subject: string | null
  body: string
  receivedAt: string
  kind: MessageKind
  kindReason: string | null
  intent: string | null
  summary: string | null
  language: string | null
  status: 'new' | 'drafted' | 'approved' | 'sent' | 'handled' | 'ignored'
  suggestedSubject: string | null
  suggestedBody: string | null
  suggestedSendAt: string | null
  suggestedSendNote: string | null
  holdFollowupUntil: string | null
  replySent: { sentAt: string; from: string; to: string; subject: string; body: string } | null
  /** Approved AND nothing changed since. */
  approvalCurrent: boolean
}

export interface Inbox {
  needsYou: InboxMessage[]
  done: InboxMessage[]
}

interface MessageRow {
  id: string
  prospect_id: string | null
  from_email: string
  from_name: string | null
  to_email: string | null
  subject: string | null
  body_text: string | null
  received_at: string
  message_id_header: string | null
  kind: MessageKind
  kind_reason: string | null
  intent: string | null
  summary: string | null
  language: string | null
  status: InboxMessage['status']
  suggested_subject: string | null
  suggested_body: string | null
  suggested_send_at: string | null
  suggested_send_note: string | null
  hold_followup_until: string | null
  approval_hash: string | null
  reply_sent_at: string | null
  reply_snapshot: { from: string; to: string; subject: string; body: string } | null
}

export async function loadInbox(db: Db): Promise<Inbox> {
  const [{ data: mData, error }, { data: pData }, settings] = await Promise.all([
    db.from('university_messages').select('*').order('received_at', { ascending: false }).limit(300),
    db.from('university_prospects').select('id, name, country'),
    loadSettings(db),
  ])
  if (error) throw new Error(error.message)
  const names = new Map(((pData ?? []) as { id: string; name: string; country: string | null }[]).map(p => [p.id, p]))
  const all: InboxMessage[] = ((mData ?? []) as MessageRow[]).map(m => {
    const p = m.prospect_id ? names.get(m.prospect_id) : undefined
    const env = replyEnvelope(m, settings)
    return {
      id: m.id,
      prospectId: m.prospect_id,
      university: p?.name ?? null,
      country: p?.country ?? null,
      fromEmail: m.from_email,
      fromName: m.from_name,
      subject: m.subject,
      body: m.body_text ?? '',
      receivedAt: m.received_at,
      kind: m.kind,
      kindReason: m.kind_reason,
      intent: m.intent,
      summary: m.summary,
      language: m.language,
      status: m.status,
      suggestedSubject: m.suggested_subject,
      suggestedBody: m.suggested_body,
      suggestedSendAt: m.suggested_send_at,
      suggestedSendNote: m.suggested_send_note,
      holdFollowupUntil: m.hold_followup_until,
      replySent: m.reply_sent_at && m.reply_snapshot ? { sentAt: m.reply_sent_at, ...m.reply_snapshot } : null,
      approvalCurrent: m.status === 'approved' && !!m.approval_hash && m.approval_hash === replyApprovalHash(env),
    }
  })
  const open = (m: InboxMessage) => m.status === 'new' || m.status === 'drafted' || m.status === 'approved'
  return { needsYou: all.filter(open).sort((a, b) => (a.receivedAt < b.receivedAt ? -1 : 1)), done: all.filter(m => !open(m)).slice(0, 40) }
}

// ── preparing, approving and sending our answer ─────────────────────────────

export function replyEnvelope(m: Pick<MessageRow, 'from_email' | 'subject' | 'suggested_subject' | 'suggested_body' | 'message_id_header'>, s: Awaited<ReturnType<typeof loadSettings>>): ReplyEnvelope {
  return {
    from: formatFrom(s.from_name, s.from_email),
    to: m.from_email,
    replyTo: s.reply_to,
    subject: m.suggested_subject ?? replySubject(m.subject),
    body: m.suggested_body ?? '',
    inReplyTo: m.message_id_header ?? '',
  }
}

async function getMessage(db: Db, id: string): Promise<MessageRow> {
  const { data, error } = await db.from('university_messages').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Message not found.')
  return data as MessageRow
}

/** What a drafting helper (the model, or a person's own text) hands back. */
export interface PreparedReply {
  intent: string
  summary: string
  language: string
  subject: string
  body: string
}

/** Store a prepared answer. It is only text until someone approves it. */
export async function storeDraft(db: Db, id: string, p: PreparedReply): Promise<void> {
  const m = await getMessage(db, id)
  if (m.kind !== 'human_reply') throw new Error('There is nothing to answer here.')
  if (m.status === 'sent') throw new Error('Already answered.')
  const { error } = await db
    .from('university_messages')
    .update({
      intent: p.intent,
      summary: p.summary,
      language: p.language,
      suggested_subject: p.subject || replySubject(m.subject),
      suggested_body: p.body,
      status: 'drafted',
      approved_at: null,
      approval_hash: null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Ask the drafter to read a reply and prepare an answer. `drafter` is injected
 * so this is testable without a network call. A reply the drafter says needs
 * no answer (a decline) is stored with an empty body and stays a note, not a
 * send.
 */
export async function draftReplyFor(db: Db, id: string, drafter: (i: DrafterInput) => Promise<DraftOutput>): Promise<PreparedReply> {
  const m = await getMessage(db, id)
  if (m.kind !== 'human_reply') throw new Error('There is nothing to answer here.')
  let university = 'the university'
  let country: string | null = null
  let firstEmail: DrafterInput['firstEmail'] = null
  if (m.prospect_id) {
    const { data: p } = await db.from('university_prospects').select('name, country, sent_at, sent_snapshot').eq('id', m.prospect_id).maybeSingle()
    if (p) {
      const row = p as { name: string; country: string | null; sent_at: string | null; sent_snapshot: { subject: string; body: string } | null }
      university = row.name
      country = row.country
      if (row.sent_snapshot && row.sent_at) firstEmail = { subject: row.sent_snapshot.subject, body: row.sent_snapshot.body, sentAt: row.sent_at }
    }
  }
  const out = await drafter({ university, country, firstEmail, inbound: { from: m.from_email, subject: m.subject, text: freshText(m) || (m.body_text ?? '') } })
  const prepared = toPrepared(out, replySubject(m.subject))
  await storeDraft(db, id, prepared)
  return prepared
}

export async function saveReply(db: Db, id: string, edit: { subject: string; body: string }): Promise<void> {
  const m = await getMessage(db, id)
  if (m.kind !== 'human_reply' || m.status === 'sent') throw new Error('This reply can no longer be edited.')
  const { error } = await db
    .from('university_messages')
    .update({ suggested_subject: edit.subject, suggested_body: edit.body, status: 'drafted', approved_at: null, approval_hash: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function approveReply(db: Db, id: string): Promise<void> {
  const [m, s] = await Promise.all([getMessage(db, id), loadSettings(db)])
  if (m.kind !== 'human_reply') throw new Error('There is nothing to answer here.')
  if (m.status !== 'drafted' && m.status !== 'approved') throw new Error('Prepare a reply first.')
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  if (!m.suggested_body?.trim()) throw new Error('The reply is empty.')
  const { error } = await db
    .from('university_messages')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approval_hash: replyApprovalHash(replyEnvelope(m, s)) })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function withdrawReply(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('university_messages')
    .update({ status: 'drafted', approved_at: null, approval_hash: null })
    .eq('id', id)
    .eq('status', 'approved')
  if (error) throw new Error(error.message)
}

export async function markMessage(db: Db, id: string, status: 'handled' | 'ignored' | 'new'): Promise<void> {
  const m = await getMessage(db, id)
  if (m.status === 'sent') throw new Error('Already answered.')
  const patch: Record<string, unknown> = { status }
  if (status === 'new') Object.assign(patch, { approved_at: null, approval_hash: null })
  const { error } = await db.from('university_messages').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export type ReplyMailer = (m: {
  from: string
  to: string
  replyTo: string
  subject: string
  text: string
  headers?: Record<string, string>
}) => Promise<{ id?: string }>

export interface ReplyOutcome {
  id: string
  sent: boolean
  reason?: ReplyRefusal
  message?: string
}

const threadHeaders = (inReplyTo: string): Record<string, string> => (inReplyTo ? { 'In-Reply-To': inReplyTo, References: inReplyTo } : {})

export async function sendReply(db: Db, id: string, { send, enabled, now = new Date() }: { send: ReplyMailer; enabled: boolean; now?: Date }): Promise<ReplyOutcome> {
  const [m, s, supp] = await Promise.all([getMessage(db, id), loadSettings(db), db.from('outreach_suppressions').select('email')])
  const env = replyEnvelope(m, s)
  const v = checkReplySend({
    kind: m.kind,
    status: m.status,
    envelope: env,
    approvalHash: m.approval_hash,
    suppressed: new Set(((supp.data ?? []) as { email: string }[]).map(r => normalizeEmail(r.email))),
    enabled,
    sender: s,
  })
  if (!v.ok) return { id, sent: false, reason: v.reason, message: REPLY_REFUSAL_TEXT[v.reason] }

  // Claim before mailing, so two overlapping clicks cannot both send.
  const { data: claimed } = await db.from('university_messages').update({ status: 'sent', reply_sent_at: now.toISOString() }).eq('id', id).eq('status', 'approved').select('id')
  if (!claimed?.length) return { id, sent: false, reason: 'already-sent', message: REPLY_REFUSAL_TEXT['already-sent'] }
  try {
    const res = await send({ from: env.from, to: env.to, replyTo: env.replyTo, subject: env.subject, text: env.body, headers: threadHeaders(env.inReplyTo) })
    await db.from('university_messages').update({ reply_message_id: res.id ?? null, reply_snapshot: { ...env, sentAt: now.toISOString() } }).eq('id', id)
    return { id, sent: true }
  } catch (err) {
    await db.from('university_messages').update({ status: 'approved', reply_sent_at: null }).eq('id', id)
    return { id, sent: false, message: err instanceof Error ? err.message : 'Send failed.' }
  }
}

/** Mail the prepared answer to the admin's own address. Changes nothing. */
export async function testReply(db: Db, id: string, { to, send }: { to: string; send: ReplyMailer }): Promise<ReplyEnvelope> {
  const [m, s] = await Promise.all([getMessage(db, id), loadSettings(db)])
  const problems = senderProblems(s)
  if (problems.length) throw new Error(problems[0])
  if (!m.suggested_body?.trim()) throw new Error('Prepare a reply first.')
  const env = replyEnvelope(m, s)
  const preview = { ...env, to, subject: `[TEST → ${m.from_email}] ${env.subject}` }
  await send({ from: preview.from, to, replyTo: preview.replyTo, subject: preview.subject, text: preview.body })
  return preview
}

/** Used by the drafter: the text of what they wrote, without our quoted email. */
export const freshText = (m: Pick<MessageRow, 'body_text'>): string => stripQuoted(m.body_text)
