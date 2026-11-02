import { createHash } from 'node:crypto'
import { normalizeEmail } from '../agents/outreach-policy.ts'
import {
  fill,
  greeting,
  greetingFr,
  languageFor,
  unknownPlaceholders,
  type ProspectForEmail,
  type RenderedEmail,
  type TemplateSettings,
} from './template.ts'
import { approvalHash, senderProblems, type Envelope, type ProspectStatus, type SenderSettings } from './gate.ts'

/**
 * The follow-up: one short, polite nudge to a university that has not replied.
 *
 * Rules, all enforced here and unit-tested:
 *   - only a university we have already emailed, that has not replied or said no
 *   - not before FOLLOWUP_MIN_DAYS have passed since the first email
 *   - exactly one, ever
 *   - approved as an exact message, like the first email
 * This module is pure; the database side lives in followup-runner.ts.
 */

export const FOLLOWUP_MIN_DAYS = 10

export const FOLLOWUP_EN: TemplateSettings = {
  subject: 'Following up: housing in Ann Arbor for your students on exchange at Michigan',
  body: `{{greeting}}

I wrote to you on {{sent_date}} about Wroomly (wroomly.app), a housing marketplace where current U-M students sublet their rooms and apartments, so exchange students can find a place for just the semester they are in Ann Arbor. I know inboxes fill up, so I wanted to follow up once.

If it would help, I can send a one-page overview you could forward to the students you nominate to Michigan. And if this isn't relevant to your office, just let me know and I won't write again.

Thank you,
Hugo
Wroomly, an independent company, not affiliated with the University of Michigan
https://wroomly.app`,
}

export const FOLLOWUP_FR: TemplateSettings = {
  subject: 'Relance : logement à Ann Arbor pour vos étudiants en échange à Michigan',
  body: `{{greeting}}

Je vous ai écrit le {{sent_date}} au sujet de Wroomly (wroomly.app), une plateforme où des étudiants de Michigan sous-louent leur chambre ou leur appartement, afin que les étudiants en échange trouvent un logement uniquement pour le semestre passé à Ann Arbor. Je sais que les boîtes de réception se remplissent vite, je me permets donc de vous relancer une seule fois.

Si cela peut vous être utile, je peux vous envoyer une présentation d'une page à transmettre aux étudiants que vous nommez pour Michigan. Et si ce sujet ne concerne pas votre service, dites-le-moi simplement et je ne vous écrirai plus.

Je vous remercie,

Cordialement,
Hugo
Wroomly, entreprise indépendante, non affiliée à l'Université du Michigan
https://wroomly.app`,
}

const MS_DAY = 86_400_000

export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / MS_DAY)
}

/** "November 2" / "2 novembre" — in the language of the email it goes into. */
export function formatSentDate(iso: string, lang: 'en' | 'fr'): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso))
}

export function renderFollowup(p: ProspectForEmail, firstSentAt: string): RenderedEmail {
  const lang = languageFor(p.country)
  const tpl = lang === 'fr' ? FOLLOWUP_FR : FOLLOWUP_EN
  const bad = unknownPlaceholders(`${tpl.subject}\n${tpl.body}`.replace(/\{\{\s*sent_date\s*\}\}/g, ''))
  if (bad.length) throw new Error(`Unknown placeholder: {{${bad[0]}}}`)
  const text = (s: string) =>
    fill(s.replace(/\{\{\s*sent_date\s*\}\}/g, formatSentDate(firstSentAt, lang)), {
      greeting: lang === 'fr' ? greetingFr(p) : greeting(p),
      university: p.name,
      partnership: '',
      country: p.country ?? '',
      origin_line: '',
    })
  return { subject: text(tpl.subject).trim(), body: text(tpl.body).trim() }
}

export interface FollowupRow {
  status: ProspectStatus
  sent_at: string | null
  followup_sent_at: string | null
}

/** Has the first email been out long enough, with no reply and no follow-up yet? */
export function isFollowupDue(r: FollowupRow, now: Date, minDays = FOLLOWUP_MIN_DAYS): boolean {
  if (r.status !== 'sent' || r.followup_sent_at) return false
  const d = daysSince(r.sent_at, now)
  return d !== null && d >= minDays
}

export type FollowupState = 'none' | 'drafted' | 'approved' | 'sent'

export function followupState(r: { followup_subject: string | null; followup_approval_hash: string | null; followup_sent_at: string | null }): FollowupState {
  if (r.followup_sent_at) return 'sent'
  if (r.followup_approval_hash) return 'approved'
  return r.followup_subject ? 'drafted' : 'none'
}

export type FollowupRefusal =
  | 'not-sent-yet'
  | 'replied-or-declined'
  | 'followup-already-sent'
  | 'sending-disabled'
  | 'sender-misconfigured'
  | 'no-contact-email'
  | 'empty-message'
  | 'not-approved'
  | 'edited-since-approval'
  | 'too-soon'
  | 'suppressed'
  | 'daily-cap-reached'

export const FOLLOWUP_REFUSAL_TEXT: Record<FollowupRefusal, string> = {
  'not-sent-yet': 'The first email has not been sent, so there is nothing to follow up.',
  'replied-or-declined': 'They replied or said no — no follow-up.',
  'followup-already-sent': 'The follow-up was already sent. There is only ever one.',
  'sending-disabled': 'Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not "true" on the server.',
  'sender-misconfigured': 'The sender or reply-to settings are not valid.',
  'no-contact-email': 'This university has no contact email.',
  'empty-message': 'The subject or body is empty.',
  'not-approved': 'Approve the follow-up first.',
  'edited-since-approval': 'The message, recipient or sender changed after you approved it. Approve it again.',
  'too-soon': `It is too soon: a follow-up waits at least ${FOLLOWUP_MIN_DAYS} days after the first email.`,
  suppressed: 'This address is on the do-not-contact list.',
  'daily-cap-reached': 'Daily send cap reached. The rest can go tomorrow.',
}

export interface FollowupCheckInput {
  status: ProspectStatus
  sentAt: string | null
  followupSentAt: string | null
  contactEmail: string | null
  approvalHash: string | null
  envelope: Envelope
  now: Date
  minDays?: number
  suppressed: Set<string>
  sentInLastDay: number
  dailyCap: number
  enabled: boolean
  sender: SenderSettings
}

/** First failing rule wins, so the refusal names the real reason. */
export function checkFollowupSend(i: FollowupCheckInput): { ok: true } | { ok: false; reason: FollowupRefusal } {
  const no = (reason: FollowupRefusal) => ({ ok: false as const, reason })
  if (i.status === 'replied' || i.status === 'declined') return no('replied-or-declined')
  if (i.status !== 'sent') return no('not-sent-yet')
  if (i.followupSentAt) return no('followup-already-sent')
  if (!i.enabled) return no('sending-disabled')
  if (senderProblems(i.sender).length) return no('sender-misconfigured')
  if (!i.contactEmail) return no('no-contact-email')
  if (!i.envelope.subject.trim() || !i.envelope.body.trim()) return no('empty-message')
  if (!i.approvalHash) return no('not-approved')
  if (followupApprovalHash(i.envelope) !== i.approvalHash) return no('edited-since-approval')
  const d = daysSince(i.sentAt, i.now)
  if (d === null || d < (i.minDays ?? FOLLOWUP_MIN_DAYS)) return no('too-soon')
  if (i.suppressed.has(normalizeEmail(i.contactEmail))) return no('suppressed')
  if (i.sentInLastDay >= i.dailyCap) return no('daily-cap-reached')
  return { ok: true }
}

/** Distinct from the first email's hash: bound to the follow-up text, and to
 *  the word "followup" so the two approvals can never be mistaken for each other. */
export function followupApprovalHash(e: Envelope): string {
  return createHash('sha256').update(`followup\u0000${approvalHash(e)}`).digest('hex')
}
