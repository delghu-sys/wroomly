import { parseAvailability, termHasEnded } from './prefill.ts'

/**
 * "How many sublets are active on Off Campus Universe right now?"
 *
 * Active means what Hugo defined: the board lists it as available AND its
 * dates have not expired. Neither signal the site makes obvious works alone:
 *
 *   - the sitemap keeps every listing ever posted, so its size says nothing;
 *   - the record's `live` flag is `true` on all of them, last year's included.
 *
 * So availability comes from the record's `status` ("Available" / "Rented"),
 * and expiry from the dates, via the same term check discovery uses.
 *
 * Pure and dependency-free so every rule can be tested. No I/O in here.
 */

export interface SubletLead {
  status: string
  skip_reason: string | null
  outreach_sent_at: string | null
  extracted: Record<string, unknown> | null
}

export type Confidence = 'confirmed' | 'likely' | 'probably-stale'

export interface ActiveSummary {
  /** Everything we have looked at on the board. */
  seen: number
  /** Year leases and similar, never counted as sublets. */
  notSublets: number
  sublets: number
  /** The headline: available, and the dates have not expired. */
  active: number
  /** How sure we are of `active`. These three always sum to it. */
  confirmed: number
  likely: number
  probablyStale: number
  /** Active listings the board has not confirmed a status for. */
  statusUnchecked: number
  /** Excluded because the board says they are taken. */
  rented: number
  /** Excluded because the dates have passed. */
  expired: number
  /** Sublets posted in the last 30 days, whatever their state. */
  postedLast30Days: number
  /** Of the active ones, how many have been emailed, and how many are ready. */
  emailed: number
  readyToEmail: number
  /** The latest time any status was read from the site, or null if never. */
  lastCheckedAt: string | null
}

/** An active listing with no end date is judged by how old the POST is. A
 *  start that has passed on a post nobody has touched in four months is a
 *  listing nobody is tending, not an offer still open. */
const STALE_AFTER_DAYS = 120

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

function confidenceOf(lead: SubletLead, now: Date): Confidence {
  const dates = str(lead.extracted?.dates)
  const postedAt = str(lead.extracted?.postedAt)
  const parsed = parseAvailability(dates, now, postedAt)

  // An end date in the future is the poster's own word: nothing to doubt.
  if (parsed?.to && parsed.to >= now.toISOString().slice(0, 10)) return 'confirmed'

  // No usable end date. Judge by the age of the post.
  const posted = postedAt ? new Date(postedAt) : null
  if (posted && !Number.isNaN(posted.getTime())) {
    const ageDays = (now.getTime() - posted.getTime()) / 86_400_000
    return ageDays <= STALE_AFTER_DAYS ? 'likely' : 'probably-stale'
  }
  // No post date at all: we cannot vouch for it either way.
  return 'likely'
}

export function summarizeActiveSublets(leads: SubletLead[], now = new Date()): ActiveSummary {
  const out: ActiveSummary = {
    seen: leads.length,
    notSublets: 0,
    sublets: 0,
    active: 0,
    confirmed: 0,
    likely: 0,
    probablyStale: 0,
    statusUnchecked: 0,
    rented: 0,
    expired: 0,
    postedLast30Days: 0,
    emailed: 0,
    readyToEmail: 0,
    lastCheckedAt: null,
  }
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)

  for (const lead of leads) {
    if (/not a sublet/.test(lead.skip_reason ?? '')) {
      out.notSublets += 1
      continue
    }
    out.sublets += 1

    const postedAt = str(lead.extracted?.postedAt)
    if (postedAt && postedAt.slice(0, 10) >= thirtyDaysAgo) out.postedLast30Days += 1

    const checked = str(lead.extracted?.boardStatusAt)
    if (checked && (!out.lastCheckedAt || checked > out.lastCheckedAt)) out.lastCheckedAt = checked

    if (termHasEnded(str(lead.extracted?.dates), now, postedAt)) {
      out.expired += 1
      continue
    }

    // Dates are fine; now the board's own word on whether it is taken.
    const board = str(lead.extracted?.boardStatus)
    if (board && board.toLowerCase() !== 'available') {
      out.rented += 1
      continue
    }
    if (!board) out.statusUnchecked += 1

    out.active += 1
    const c = confidenceOf(lead, now)
    if (c === 'confirmed') out.confirmed += 1
    else if (c === 'likely') out.likely += 1
    else out.probablyStale += 1

    if (lead.outreach_sent_at) out.emailed += 1
    else if (lead.status === 'drafted') out.readyToEmail += 1
  }
  return out
}
