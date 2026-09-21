/**
 * Resend delivery events → suppression decisions.
 *
 * Pure and dependency-free, like outreach-policy.ts, because this is another
 * "a bug here means mailing someone we promised not to mail" module — and its
 * inverse, suppressing someone we never heard a complaint from. The webhook
 * route does I/O; every judgement call lives here where it can be tested.
 */

import { normalizeEmail } from './outreach-policy.ts'

export type SuppressionReason = 'bounced' | 'complaint'

export interface SuppressionPlan {
  emails: string[]
  reason: SuppressionReason
}

/** Shape we actually rely on. Resend sends more; we read only this. */
interface ResendEventish {
  type?: unknown
  data?: {
    to?: unknown
    bounce?: { type?: unknown; subType?: unknown; message?: unknown }
  }
}

/**
 * Bounce classes, passed through from SES.
 *
 *   Permanent    — the address does not exist. Never send again.
 *   Undetermined — the receiver would not say why. Treated as permanent:
 *                  the cost of dropping one cold lead is far lower than the
 *                  sender-reputation cost of repeatedly hitting a bad address.
 *   Transient    — mailbox full, greylisted, temporarily deferred. NOT a
 *                  reason to suppress a person forever.
 */
const PERMANENT_BOUNCE_TYPES = new Set(['permanent', 'undetermined'])

/**
 * What this event means for the suppression list, or null for "nothing".
 *
 * Note this deliberately does not care which email bounced. The webhook fires
 * for transactional mail too (inquiries, Match alerts), and a hard bounce
 * there means the same thing: the address is dead, so outreach must not use
 * it either. Only outreach consults this table, so suppressing is never
 * user-visible.
 */
export function planSuppression(event: unknown): SuppressionPlan | null {
  const e = (event ?? {}) as ResendEventish
  const reason = suppressionReasonFor(e)
  if (!reason) return null

  const emails = recipients(e.data?.to)
  return emails.length > 0 ? { emails, reason } : null
}

function suppressionReasonFor(e: ResendEventish): SuppressionReason | null {
  if (e.type === 'email.complained') return 'complaint'
  if (e.type !== 'email.bounced') return null

  // A bounce event with no classification is not automatically permanent —
  // refuse to guess rather than suppress someone on a malformed payload.
  const bounceType = e.data?.bounce?.type
  if (typeof bounceType !== 'string') return null
  return PERMANENT_BOUNCE_TYPES.has(bounceType.trim().toLowerCase()) ? 'bounced' : null
}

/** `to` is an array, but never trust the wire. Normalized + de-duplicated. */
function recipients(to: unknown): string[] {
  const raw = Array.isArray(to) ? to : typeof to === 'string' ? [to] : []
  const out = new Set<string>()
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const email = normalizeEmail(entry)
    if (email.includes('@')) out.add(email)
  }
  return [...out]
}
