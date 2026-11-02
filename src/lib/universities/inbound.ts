import { htmlToText } from '../agents/prefill.ts'
import type { InboundInput } from './replies-runner.ts'
import { INBOUND_DOMAIN, SENDER_DOMAIN } from './gate.ts'

/**
 * Resend's "email.received" event → one stored message. Pure, so the judgement
 * calls (whose mail is this, what did they write, should we ignore it) are
 * tested without a network.
 *
 * Everything in here is attacker-controlled text: anyone can email the
 * receiving address. It is parsed defensively and only ever stored as data.
 */

export interface InboundEvent {
  type?: unknown
  data?: { email_id?: unknown; id?: unknown; created_at?: unknown }
}

/** The id of the received email, if this is an `email.received` event. */
export function receivedEmailId(event: unknown): string | null {
  const e = (event ?? {}) as InboundEvent
  if (e.type !== 'email.received') return null
  const id = e.data?.email_id ?? e.data?.id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

/** "Ada Lovelace <ada@x.edu>" → { name, email }. */
export function parseAddress(raw: string | null | undefined): { name: string | null; email: string } | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  const angle = text.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/)
  const email = (angle ? angle[2] : text).trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null
  const name = angle ? angle[1].trim().replace(/^"|"$/g, '').trim() : ''
  return { name: name || null, email }
}

/** What they wrote, as text: the plain part if there is one, else the HTML made readable. */
export function bodyOf(m: { text?: string | null; html?: string | null }): string {
  const text = (m.text ?? '').trim()
  if (text) return text
  return (htmlToText(m.html ?? '') ?? '').trim()
}

export interface ReceivedEmail {
  id: string
  from: string
  to: string[]
  subject: string | null
  created_at: string
  message_id: string | null
  text: string | null
  html: string | null
  headers: Record<string, string> | null
}

const header = (h: Record<string, string> | null, name: string): string | null => {
  if (!h) return null
  const k = Object.keys(h).find(x => x.toLowerCase() === name)
  const v = k ? h[k] : null
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Is this mail from us — our own sender, the receiving subdomain, anything @wroomly.app? Never ingest those: it would turn our own test emails and notices into "replies". */
export function isOwnMail(email: string): boolean {
  const e = email.toLowerCase()
  return e.endsWith(`@${SENDER_DOMAIN}`) || e.endsWith(`@${INBOUND_DOMAIN}`)
}

export function toInbound(m: ReceivedEmail): InboundInput | null {
  const from = parseAddress(m.from)
  if (!from) return null
  return {
    source: 'resend_inbound',
    externalId: m.id,
    messageIdHeader: m.message_id ?? header(m.headers, 'message-id'),
    inReplyTo: header(m.headers, 'in-reply-to'),
    from: from.email,
    fromName: from.name,
    to: m.to?.[0] ?? null,
    subject: m.subject,
    body: bodyOf(m),
    receivedAt: m.created_at,
  }
}

// ── telling the operator ────────────────────────────────────────────────────

const oneLine = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max)

export interface NoticeInput {
  kind: 'human_reply' | 'opt_out'
  university: string | null
  fromEmail: string
  subject: string | null
  preview: string
  drafted: boolean
  dashboardUrl: string
}

/** The short email that tells you something arrived. Plain text, no HTML, and the sender's own words are quoted, never obeyed. */
export function buildNotice(n: NoticeInput): { subject: string; text: string } {
  const who = n.university ?? n.fromEmail
  if (n.kind === 'opt_out') {
    return {
      subject: `${oneLine(who, 60)} asked us to stop — suppressed`,
      text: `${who} (${n.fromEmail}) asked not to be contacted again.\n\nThe address has been suppressed and the university marked declined automatically. Nothing for you to do.\n\nDetails: ${n.dashboardUrl}\n`,
    }
  }
  return {
    subject: `New reply from ${oneLine(who, 60)}`,
    text: `${who} replied${n.subject ? ` to "${oneLine(n.subject, 80)}"` : ''}.\n\nThey wrote:\n"${oneLine(n.preview, 400)}"\n\n${n.drafted ? 'An answer is prepared and waiting for your approval.' : 'No answer is prepared yet — open the dashboard and click "Prepare a reply".'}\n\nReview and approve it here:\n${n.dashboardUrl}\n\nNothing is sent until you approve it.\n`,
  }
}
