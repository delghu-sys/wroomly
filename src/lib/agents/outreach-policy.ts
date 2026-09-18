/**
 * Who may be contacted, and who may not.
 *
 * Deliberately pure and dependency-free so it is unit-testable: every rule here
 * is one where a bug means mailing someone we promised not to mail. The send
 * script must not make these decisions itself — it asks this module.
 */

export interface OutreachCandidate {
  id: string
  contact_email: string | null
  status: string
  import_request_id: string | null
  outreach_sent_at: string | null
}

export type SkipReason =
  | 'no-contact-email'
  | 'no-draft-ready'
  | 'already-contacted'
  | 'suppressed'
  | 'duplicate-in-batch'
  | 'daily-cap-reached'

export interface OutreachPlan {
  send: OutreachCandidate[]
  skipped: { id: string; email: string | null; reason: SkipReason }[]
  capRemaining: number
}

/** Lowercase + trim. Suppression matching MUST use this on both sides, or an
 *  opt-out of "A@x.com" would not stop a send to "a@x.com". */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Decide the send list.
 *
 * Rules, in order — the first that matches wins, so `skipped` explains exactly
 * why anyone was held back:
 *   1. must have a contact address
 *   2. must already have a claimable draft (we never message someone before
 *      there is something for them to claim)
 *   3. never message the same lead twice
 *   4. never message a suppressed address (opt-out / bounce / complaint)
 *   5. never message the same address twice within one batch
 *   6. stop at the daily cap
 */
export function planOutreach({
  candidates,
  suppressed,
  sentInLastDay,
  dailyCap,
}: {
  candidates: OutreachCandidate[]
  /** Suppressed addresses. Normalized internally, so raw DB values are fine. */
  suppressed: Iterable<string>
  /** How many sends already happened in the trailing 24h. */
  sentInLastDay: number
  dailyCap: number
}): OutreachPlan {
  const blocked = new Set([...suppressed].map(normalizeEmail))
  const seenInBatch = new Set<string>()
  const send: OutreachCandidate[] = []
  const skipped: OutreachPlan['skipped'] = []

  let remaining = Math.max(0, dailyCap - sentInLastDay)

  for (const c of candidates) {
    const email = normalizeEmail(c.contact_email)
    const skip = (reason: SkipReason) => skipped.push({ id: c.id, email: email || null, reason })

    if (!email) { skip('no-contact-email'); continue }
    if (c.status !== 'drafted' || !c.import_request_id) { skip('no-draft-ready'); continue }
    if (c.outreach_sent_at) { skip('already-contacted'); continue }
    if (blocked.has(email)) { skip('suppressed'); continue }
    if (seenInBatch.has(email)) { skip('duplicate-in-batch'); continue }
    if (remaining <= 0) { skip('daily-cap-reached'); continue }

    seenInBatch.add(email)
    send.push(c)
    remaining -= 1
  }

  return { send, skipped, capRemaining: remaining }
}
