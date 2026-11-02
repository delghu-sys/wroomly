import { createHash } from 'node:crypto'
import { normalizeEmail } from '../agents/outreach-policy.ts'
import { senderProblems, type SenderSettings } from './gate.ts'

/**
 * Reading what universities write back — as plain, testable rules.
 *
 * The important judgements here are deliberately NOT made by a language model:
 *   - is this an automatic reply, a bounce, or a person?
 *   - did they ask us to stop?
 * A model can misread or be talked into things by the email it is reading;
 * these rules cannot. A model is used only afterwards, to summarise a real
 * reply and prepare an answer a person still has to approve.
 */

export type MessageKind = 'auto_reply' | 'human_reply' | 'opt_out' | 'bounce'

export interface InboundMessage {
  from: string
  subject: string | null
  body: string | null
}

export interface Classification {
  kind: MessageKind
  reason: string
  /** For an auto-reply: how long to hold off following up, in days. */
  holdDays?: number
}

// ── quoted text ─────────────────────────────────────────────────────────────

/** Only what the person wrote NEW — not our own email quoted back at us. */
export function stripQuoted(body: string | null | undefined): string {
  const text = (body ?? '').replace(/\r\n/g, '\n')
  const cut = text.search(
    /^(?:on .{5,120}wrote:|le .{5,120}a écrit\s*:|el .{5,120}escribió:|am .{5,120}schrieb .*:|-{2,}\s*(?:original message|message d'origine|mensaje original|ursprüngliche nachricht)|from:\s|de\s*:\s|van:\s|von:\s)/im,
  )
  const fresh = cut >= 0 ? text.slice(0, cut) : text
  return fresh
    .split('\n')
    .filter(l => !l.trim().startsWith('>'))
    .join('\n')
    .trim()
}

// ── bounce / auto-reply / opt-out ───────────────────────────────────────────

const BOUNCE_SENDER = /^(mailer-daemon|postmaster|mail delivery|noreply-dmarc|no-reply-bounce)/i
const BOUNCE_SUBJECT =
  /\b(undeliver(?:able|ed)|delivery (?:status notification|failure|has failed)|returned mail|mail delivery (?:failed|subsystem)|failure notice|non[- ]?remis|n'a pas pu être distribué|zustellung fehlgeschlagen|no se pudo entregar)\b/i

const AUTO_SUBJECT =
  /^\s*(?:re:\s*)?(?:automatic reply|auto[- ]?reply|autoreply|auto:|automated (?:reply|response)|out of (?:the )?office|ooo\b|abwesenheits|automatische antwort|réponse automatique|réponse d'absence|absence du bureau|respuesta automática|ausencia|resposta automática|vacation|risposta automatica|automatisch antwoord|automatiskt svar|automatisk svar)/i
const AUTO_BODY =
  /\b(this is an automated (?:reply|response|message)|automated response to acknowledge|this is an automatic reply|auto-?reply|i am (?:currently )?out of (?:the )?office|i(?:'m| am) away (?:from|until)|currently out of the office|will be out of the office|cet email est une réponse automatique|ceci est un message automatique|je suis absent|dies ist eine automatische|ich bin (?:derzeit )?(?:nicht im büro|abwesend)|esta es una respuesta automática|estoy fuera de la oficina)\b/i

// They ask us to stop, or say it is not for them. Our own email promised
// "just reply and I won't write again", so both count as a request to stop.
const OPT_OUT =
  /\b(unsubscribe|remove (?:me|us|this address)|take me off|do not (?:contact|email|write|send)|don'?t (?:contact|email|write|send)|stop (?:emailing|writing|sending|contacting)|no further (?:emails?|contact|messages?)|not interested|not relevant|no thank(?:s| you)|please do not|ne (?:plus )?(?:me |nous )?(?:contacter|écrire|envoyer)|merci de ne plus|pas intéressé|désinscri|veuillez (?:me )?supprimer|retirez[- ](?:moi|nous)|no (?:me |nos )?(?:escriba|contacte|envíe|envíen)|no (?:estamos )?interesad[oa]|nicht (?:mehr )?kontaktieren|keine (?:weiteren )?(?:e-?mails|nachrichten)|kein interesse)\b/i

const WORKING_DAYS = /\b(\d{1,2})\s*(?:working|business|work)\s*days?\b/i
const DEFAULT_HOLD_DAYS = 14

/** The order matters: a bounce is not a person; an opt-out beats an auto-reply. */
export function classifyInbound(m: InboundMessage): Classification {
  const subject = m.subject ?? ''
  const fresh = stripQuoted(m.body)

  if (BOUNCE_SENDER.test(m.from.split('@')[0] ?? '') || BOUNCE_SUBJECT.test(subject))
    return { kind: 'bounce', reason: 'delivery failure notice' }

  const auto = AUTO_SUBJECT.test(subject) || AUTO_BODY.test(fresh.slice(0, 1500))
  if (auto) {
    const n = Number(WORKING_DAYS.exec(fresh)?.[1])
    const holdDays = Number.isFinite(n) && n > 0 ? Math.max(DEFAULT_HOLD_DAYS, Math.ceil((n * 7) / 5) + 7) : DEFAULT_HOLD_DAYS
    return { kind: 'auto_reply', reason: 'automatic reply', holdDays }
  }

  // Only the first part of what they wrote: an opt-out is up front, and a long
  // thread could contain these words about something else.
  const head = fresh.slice(0, 700)
  const hit = OPT_OUT.exec(head)
  if (hit) return { kind: 'opt_out', reason: `asked us to stop ("${hit[0].toLowerCase()}")` }

  return { kind: 'human_reply', reason: 'a person replied' }
}

export const holdUntil = (receivedAt: string, holdDays: number): string =>
  new Date(new Date(receivedAt).getTime() + holdDays * 86_400_000).toISOString()

// ── which university wrote? ─────────────────────────────────────────────────

export interface ProspectRef {
  id: string
  contact_email: string | null
  name: string
}

const registrable = (domain: string): string => {
  const parts = domain.toLowerCase().split('.')
  // ac.uk, co.uk, edu.au … keep three labels
  const twoPart = new Set(['ac', 'co', 'edu', 'gov', 'org', 'com'])
  return parts.length >= 3 && twoPart.has(parts[parts.length - 2]) && parts[parts.length - 1].length === 2
    ? parts.slice(-3).join('.')
    : parts.slice(-2).join('.')
}

/**
 * The university this sender belongs to: an exact address match first; failing
 * that, the one university whose address shares the sender's domain. If more
 * than one shares the domain (e.g. two EDHEC offices), it is ambiguous and a
 * person decides — a wrong guess would mark the wrong university as replied.
 */
export function matchProspect(from: string, prospects: ProspectRef[]): { prospect: ProspectRef | null; how: 'address' | 'domain' | 'ambiguous' | 'none' } {
  const addr = normalizeEmail(from)
  const exact = prospects.filter(p => p.contact_email && normalizeEmail(p.contact_email) === addr)
  if (exact.length === 1) return { prospect: exact[0], how: 'address' }
  if (exact.length > 1) return { prospect: null, how: 'ambiguous' }

  const dom = addr.split('@')[1]
  if (!dom) return { prospect: null, how: 'none' }
  const key = registrable(dom)
  const same = prospects.filter(p => p.contact_email && registrable(normalizeEmail(p.contact_email).split('@')[1] ?? '') === key)
  if (same.length === 1) return { prospect: same[0], how: 'domain' }
  return { prospect: null, how: same.length > 1 ? 'ambiguous' : 'none' }
}

// ── when to answer ──────────────────────────────────────────────────────────

const TZ: Record<string, string> = {
  'united kingdom': 'Europe/London', uk: 'Europe/London', ireland: 'Europe/Dublin', iceland: 'Atlantic/Reykjavik', portugal: 'Europe/Lisbon',
  france: 'Europe/Paris', germany: 'Europe/Berlin', spain: 'Europe/Madrid', italy: 'Europe/Rome', netherlands: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels', switzerland: 'Europe/Zurich', austria: 'Europe/Vienna', denmark: 'Europe/Copenhagen', sweden: 'Europe/Stockholm',
  norway: 'Europe/Oslo', finland: 'Europe/Helsinki', greece: 'Europe/Athens', 'czech republic': 'Europe/Prague', czechia: 'Europe/Prague',
  hungary: 'Europe/Budapest', poland: 'Europe/Warsaw', turkey: 'Europe/Istanbul', israel: 'Asia/Jerusalem', canada: 'America/Toronto',
  'united states': 'America/New_York', peru: 'America/Lima', brazil: 'America/Sao_Paulo', chile: 'America/Santiago', ghana: 'Africa/Accra',
  'hong kong': 'Asia/Hong_Kong', china: 'Asia/Shanghai', taiwan: 'Asia/Taipei', singapore: 'Asia/Singapore', japan: 'Asia/Tokyo',
  'south korea': 'Asia/Seoul', thailand: 'Asia/Bangkok', australia: 'Australia/Sydney', pakistan: 'Asia/Karachi', india: 'Asia/Kolkata',
}

export const timezoneFor = (country: string | null): string | null => (country ? (TZ[country.trim().toLowerCase()] ?? null) : null)

function localParts(date: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)
      .map(x => [x.type, x.value]),
  )
  return { weekday: p.weekday as string, hour: Number(p.hour), minute: Number(p.minute), y: Number(p.year), m: Number(p.month), d: Number(p.day) }
}

const WORKDAY = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

export interface SendTime {
  at: string
  note: string
  /** True when "now" is already a good moment. */
  now: boolean
}

/**
 * When to send an answer: during the recipient's working day. Inside their
 * 09:00–16:00 on a weekday → now. Otherwise the next weekday at 09:30 THEIR
 * time. Unknown country → now, with a note (we will not guess a timezone).
 */
export function suggestSendTime(country: string | null, now: Date): SendTime {
  const tz = timezoneFor(country)
  if (!tz) return { at: now.toISOString(), note: 'Timezone unknown — send when it suits you.', now: true }
  const city = tz.split('/')[1].replace(/_/g, ' ')
  const l = localParts(now, tz)
  const inHours = WORKDAY.has(l.weekday) && l.hour >= 9 && l.hour < 16
  if (inHours) return { at: now.toISOString(), note: `It is working hours in ${city} now (${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}).`, now: true }

  // Walk forward in 30-minute steps to the next weekday 09:30 local.
  let t = new Date(now.getTime())
  for (let i = 0; i < 24 * 2 * 8; i++) {
    t = new Date(t.getTime() + 30 * 60_000)
    const p = localParts(t, tz)
    if (WORKDAY.has(p.weekday) && p.hour === 9 && p.minute === 30) {
      return { at: t.toISOString(), note: `${p.weekday} 09:30 ${city} time — the start of their working day.`, now: false }
    }
  }
  return { at: now.toISOString(), note: 'Send when it suits you.', now: true }
}

// ── our answer: approval and sending ────────────────────────────────────────

export interface ReplyEnvelope {
  from: string
  to: string
  replyTo: string
  subject: string
  body: string
  /** The Message-ID of the email we are answering, so it threads. */
  inReplyTo: string
}

export const replyApprovalHash = (e: ReplyEnvelope): string =>
  createHash('sha256')
    .update(['reply', e.from, normalizeEmail(e.to), normalizeEmail(e.replyTo), e.subject, e.body, e.inReplyTo].join('\u0000'))
    .digest('hex')

export const replySubject = (original: string | null): string => {
  const s = (original ?? '').trim()
  return /^re:/i.test(s) ? s : `Re: ${s || 'your message'}`
}

export type ReplyRefusal =
  | 'not-a-person'
  | 'already-sent'
  | 'sending-disabled'
  | 'sender-misconfigured'
  | 'empty-message'
  | 'not-approved'
  | 'edited-since-approval'
  | 'suppressed'

export const REPLY_REFUSAL_TEXT: Record<ReplyRefusal, string> = {
  'not-a-person': 'This is an automatic message or an opt-out — there is nothing to answer.',
  'already-sent': 'Already answered.',
  'sending-disabled': 'Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not "true" on the server.',
  'sender-misconfigured': 'The sender or reply-to settings are not valid.',
  'empty-message': 'The reply is empty.',
  'not-approved': 'Approve the reply first.',
  'edited-since-approval': 'The reply, recipient or sender changed after you approved it. Approve it again.',
  suppressed: 'This address is on the do-not-contact list.',
}

export interface ReplyCheckInput {
  kind: MessageKind
  status: string
  envelope: ReplyEnvelope
  approvalHash: string | null
  suppressed: Set<string>
  enabled: boolean
  sender: SenderSettings
}

export function checkReplySend(i: ReplyCheckInput): { ok: true } | { ok: false; reason: ReplyRefusal } {
  const no = (reason: ReplyRefusal) => ({ ok: false as const, reason })
  if (i.kind !== 'human_reply') return no('not-a-person')
  if (i.status === 'sent') return no('already-sent')
  if (!i.enabled) return no('sending-disabled')
  if (senderProblems(i.sender).length) return no('sender-misconfigured')
  if (!i.envelope.subject.trim() || !i.envelope.body.trim()) return no('empty-message')
  if (i.status !== 'approved' || !i.approvalHash) return no('not-approved')
  if (replyApprovalHash(i.envelope) !== i.approvalHash) return no('edited-since-approval')
  if (i.suppressed.has(normalizeEmail(i.envelope.to))) return no('suppressed')
  return { ok: true }
}
