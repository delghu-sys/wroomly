/**
 * Pulling a street address and real dates out of what a board actually printed.
 *
 * to-draft.ts is deliberately unwilling to invent data, and that stays true
 * here: every function below returns null rather than guess. But refusing to
 * read "January to August 2026" as a date range was over-correcting — the
 * person claiming the draft then had to retype something their own post
 * already said, which is exactly the retyping the outreach email promises to
 * save them.
 *
 * The safety net is structural, not in this file: `address` alone can never
 * publish a listing, because publish-validation also requires lat/lng, and
 * those only exist once the person picks their address from the geocoding
 * suggestions. So a prefilled address is a starting point they must confirm,
 * never a location we asserted.
 *
 * Pure and dependency-free so every rule here is unit-testable.
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

const MONTH_WORD = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const YEAR = '(20\\d{2})'
const DASH = '(?:to|through|until|till|[-–—])'

export interface Availability {
  /** ISO yyyy-mm-dd, first of the month unless the text gave a day. */
  from: string | null
  /** ISO yyyy-mm-dd, last day of the month unless the text gave a day. */
  to: string | null
  /** True when the end is past at `now` — the post is stale and must be fixed. */
  alreadyEnded: boolean
}

const iso = (y: number, m: number, d: number) =>
  // UTC on purpose: these are calendar dates, not instants. Building them in
  // local time puts the 1st of a month on the last of the previous one for
  // anyone behind UTC.
  new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)

const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/**
 * Read a board's free-text term into real dates.
 *
 * Requires an explicit 4-digit year. "January to August" is genuinely
 * ambiguous — this year's term or next year's? — and picking one would put a
 * wrong date in front of someone about to publish their own home, so it stays
 * unparsed and the review UI keeps asking.
 *
 * Handles what the sources actually print:
 *   "August 2025"                 → from only
 *   "January to August 2026"      → Jan 1 – Aug 31 2026
 *   "January - August 2026"       → same, en/em dashes and hyphens alike
 *   "January-July 2026"           → same, no spaces
 *   "Aug 2026 to May 2027"        → year on each side
 *   "September to May 2027"       → end month precedes start, so the START is
 *                                   the year before: Sep 1 2026 – May 31 2027
 *   "January to May+"             → null (no year)
 */
export function parseAvailability(raw: string | null | undefined, now = new Date()): Availability | null {
  if (!raw) return null
  const text = raw.toLowerCase().trim()
  if (!text) return null

  // Month Year <dash> Month Year — a year on each side, nothing to infer.
  const both = new RegExp(`${MONTH_WORD}\\s+${YEAR}\\s*${DASH}\\s*${MONTH_WORD}\\s+${YEAR}`).exec(text)
  if (both) {
    const [, m1, y1, m2, y2] = both
    return range(MONTHS[m1], Number(y1), MONTHS[m2], Number(y2), now)
  }

  // Month <dash> Month Year — one year, belonging to the END of the term.
  const shared = new RegExp(`${MONTH_WORD}\\s*${DASH}\\s*${MONTH_WORD}\\s+${YEAR}`).exec(text)
  if (shared) {
    const [, m1, m2, y] = shared
    const endYear = Number(y)
    // "September to May 2027" spans a new year, so the start is 2026.
    const startYear = MONTHS[m1] > MONTHS[m2] ? endYear - 1 : endYear
    return range(MONTHS[m1], startYear, MONTHS[m2], endYear, now)
  }

  // A single Month Year — a start, with no end stated.
  const single = new RegExp(`${MONTH_WORD}\\s+${YEAR}`).exec(text)
  if (single) {
    const [, m, y] = single
    return { from: iso(Number(y), MONTHS[m], 1), to: null, alreadyEnded: false }
  }

  return null
}

function range(m1: number, y1: number, m2: number, y2: number, now: Date): Availability | null {
  const from = iso(y1, m1, 1)
  const to = iso(y2, m2, lastDayOfMonth(y2, m2))
  // A range that ends before it starts is a misread, not a term. Refuse it
  // rather than hand someone a draft that can never be valid.
  if (to < from) return null
  return { from, to, alreadyEnded: to < now.toISOString().slice(0, 10) }
}

export interface StreetAddress {
  address: string
  /** Only when the text carried a full 5-digit ZIP. */
  zipCode: string | null
}

const CITY_STATE_TAIL = /,\s*ann\s+arbor\s*,?\s*(?:mi|michigan)\b[\s,]*(\d{3,5})?\s*$/i

/**
 * Read a street address out of a listing title.
 *
 * Off Campus Universe titles ARE the address ("721 S Forest Ave"), so this is
 * reading, not inferring. The house-number requirement is what keeps it
 * honest: a title like "Sublet near U-M" or "2 bed in Kerrytown" yields null
 * rather than a half-address that looks filled in but locates nothing.
 *
 * A trailing ", Ann Arbor, MI 48104" is stripped, since city and state are set
 * separately on the draft. A truncated ZIP is dropped rather than stored —
 * one real title arrives cut off as "MI 4810".
 */
export function parseStreetAddress(title: string | null | undefined): StreetAddress | null {
  if (!title) return null
  let text = title.trim().replace(/\s+/g, ' ')
  if (!text) return null

  let zipCode: string | null = null
  const tail = CITY_STATE_TAIL.exec(text)
  if (tail) {
    if (tail[1] && tail[1].length === 5) zipCode = tail[1]
    text = text.slice(0, tail.index).trim().replace(/,\s*$/, '')
  }

  // Must open with a house number and carry at least one more word, so a bare
  // number or a marketing title never passes.
  if (!/^\d+[a-z]?\b/i.test(text)) return null
  if (!/^\d+[a-z]?\s+\S+/i.test(text)) return null
  // Guard against a title that merely starts with a count ("2 bed flat").
  if (/^\d+\s*(bed|bd|br|bath|ba|bedroom|bathroom|person)s?\b/i.test(text)) return null

  return { address: text, zipCode }
}

/** A sublet term longer than this doesn't exist; past it, a start date with no
 *  stated end is a finished term rather than an open-ended offer. */
const MAX_TERM_MONTHS = 12

/**
 * Has this term already finished?
 *
 * Used to keep expired posts out of the queue entirely — emailing someone
 * about a sublet they filled months ago is both useless and the fastest way
 * to collect spam complaints.
 *
 * Returns false when the text can't be read: a post we can't date is not
 * evidence of staleness, and silently dropping leads on a parsing gap would
 * be worse than reviewing one stale post. Only a term we can PROVE is over
 * gets rejected.
 */
export function termHasEnded(raw: string | null | undefined, now = new Date()): boolean {
  const parsed = parseAvailability(raw, now)
  if (!parsed) return false

  const today = now.toISOString().slice(0, 10)
  if (parsed.to) return parsed.to < today

  // A start with no end: "August 2025" says nothing explicit about the finish,
  // but a sublet that began more than a year ago is not a current listing.
  if (parsed.from) {
    const cutoff = new Date(now)
    cutoff.setUTCMonth(cutoff.getUTCMonth() - MAX_TERM_MONTHS)
    return parsed.from < cutoff.toISOString().slice(0, 10)
  }
  return false
}
