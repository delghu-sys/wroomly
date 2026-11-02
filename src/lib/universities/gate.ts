import { createHash } from 'node:crypto'
import { normalizeEmail } from '../agents/outreach-policy.ts'

/**
 * Who may be emailed, and when. Pure, so every rule is unit-tested: each one
 * is a place where a bug sends a stranger something nobody approved.
 */

export const SENDER_DOMAIN = 'wroomly.app'
/** The receive-only subdomain Resend delivers replies to (see docs). */
export const INBOUND_DOMAIN = 'replies.wroomly.app'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type ProspectStatus =
  | 'researched'
  | 'drafted'
  | 'approved'
  | 'sent'
  | 'replied'
  | 'declined'
  | 'skipped'

export interface Envelope {
  /** "Hugo from Wroomly <hugo@wroomly.app>" — exactly what the recipient sees. */
  from: string
  to: string
  replyTo: string
  subject: string
  body: string
}

/** What an approval is bound to. Change any of it and the approval is void. */
export function approvalHash(e: Envelope): string {
  return createHash('sha256')
    .update([e.from, e.to.trim().toLowerCase(), e.replyTo.trim().toLowerCase(), e.subject, e.body].join('\u0000'))
    .digest('hex')
}

export function formatFrom(name: string, email: string): string {
  return `${name.replace(/[<>"\r\n]/g, '').trim()} <${email.trim()}>`
}

export interface SenderSettings {
  from_name: string
  from_email: string
  reply_to: string
}

/** Problems with the sender setup, in plain words. Empty = fine. */
export function senderProblems(s: SenderSettings): string[] {
  const out: string[] = []
  if (!s.from_name.trim()) out.push('Sender name is empty.')
  if (!EMAIL_RE.test(s.from_email.trim())) out.push('Sender email is not a valid address.')
  else if (!s.from_email.trim().toLowerCase().endsWith(`@${SENDER_DOMAIN}`))
    out.push(`Sender email must be an @${SENDER_DOMAIN} address — that is the domain verified for sending.`)
  if (!EMAIL_RE.test(s.reply_to.trim())) out.push('Reply-to is not set. Replies must come to a mailbox you read.')
  return out
}

/** Is this address one that WE receive on (the automatic inbox)? */
export const isInboundAddress = (email: string | null | undefined): boolean =>
  (email ?? '').trim().toLowerCase().endsWith(`@${INBOUND_DOMAIN}`)

/**
 * Who to tell when a reply arrives. An explicit "notify" address wins; failing
 * that, the Reply-to — but only if it is a mailbox a person reads, not an
 * address on the receiving subdomain (that one is read by the server, so
 * telling it would tell no one).
 */
export function notifyTarget(s: { notify_email?: string | null; reply_to: string }): string | null {
  const explicit = (s.notify_email ?? '').trim()
  if (EMAIL_RE.test(explicit)) return explicit
  const rt = s.reply_to.trim()
  return EMAIL_RE.test(rt) && !isInboundAddress(rt) ? rt : null
}

export interface SendCheckInput {
  status: ProspectStatus
  contactEmail: string | null
  confidence: 'verified' | 'likely' | 'not_found'
  approvalHash: string | null
  /** The envelope as it would go out right now. */
  envelope: Envelope
  suppressed: Set<string>
  /** Addresses already emailed (any prospect). */
  alreadyEmailed: Set<string>
  sentInLastDay: number
  dailyCap: number
  /** UNIVERSITY_OUTREACH_ENABLED === 'true' */
  enabled: boolean
  sender: SenderSettings
}

export type SendRefusal =
  | 'sending-disabled'
  | 'sender-misconfigured'
  | 'no-contact-email'
  | 'not-approved'
  | 'edited-since-approval'
  | 'already-sent'
  | 'suppressed'
  | 'address-already-emailed'
  | 'daily-cap-reached'
  | 'empty-message'

export const REFUSAL_TEXT: Record<SendRefusal, string> = {
  'sending-disabled': 'Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not "true" on the server.',
  'sender-misconfigured': 'The sender or reply-to settings are not valid.',
  'no-contact-email': 'This university has no contact email.',
  'not-approved': 'Approve the message first.',
  'edited-since-approval': 'The message, recipient or sender changed after you approved it. Review and approve it again.',
  'already-sent': 'Already sent.',
  'suppressed': 'This address is on the do-not-contact list.',
  'address-already-emailed': 'This address was already emailed (another entry shares it).',
  'daily-cap-reached': 'Daily send cap reached. The rest can go tomorrow.',
  'empty-message': 'The subject or body is empty.',
}

/** First rule that fails wins, so the refusal names the real reason. */
export function checkSend(i: SendCheckInput): { ok: true } | { ok: false; reason: SendRefusal } {
  const no = (reason: SendRefusal) => ({ ok: false as const, reason })

  if (i.status === 'sent' || i.status === 'replied') return no('already-sent')
  if (!i.enabled) return no('sending-disabled')
  if (senderProblems(i.sender).length) return no('sender-misconfigured')
  if (!i.contactEmail || !EMAIL_RE.test(i.contactEmail) || i.confidence === 'not_found') return no('no-contact-email')
  if (!i.envelope.subject.trim() || !i.envelope.body.trim()) return no('empty-message')
  if (i.status !== 'approved' || !i.approvalHash) return no('not-approved')
  if (approvalHash(i.envelope) !== i.approvalHash) return no('edited-since-approval')

  const to = normalizeEmail(i.contactEmail)
  if (i.suppressed.has(to)) return no('suppressed')
  if (i.alreadyEmailed.has(to)) return no('address-already-emailed')
  if (i.sentInLastDay >= i.dailyCap) return no('daily-cap-reached')
  return { ok: true }
}

/**
 * A message naming the field that failed validation. The settings form used to
 * say only "check the fields", which sends someone hunting through six inputs.
 */
export function settingsFieldMessage(field: string): string {
  switch (field) {
    case 'reply_to':
      return 'Reply-to must be one plain email address, like name@gmail.com — no name in front, no spaces, no <angle brackets>.'
    case 'from_email':
      return `From address must be one plain email address ending in @${SENDER_DOMAIN}.`
    case 'notify_email':
      return 'Notify me at must be one plain email address, or left empty.'
    case 'from_name':
      return 'Sender name is empty or longer than 80 characters.'
    case 'daily_cap':
      return 'Daily send cap must be a whole number from 1 to 200.'
    case 'subject':
      return 'Subject is empty or longer than 200 characters.'
    case 'body':
      return 'The message is empty or longer than 6,000 characters.'
    default:
      return 'Check the fields: names and addresses must be valid.'
  }
}
