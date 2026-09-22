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

/**
 * One "January", "Jan 6", "August 20th", "January 1, 2026" — month first,
 * then an optional day (ordinal suffix allowed) and an optional year. Real
 * boards write terms every one of these ways in the same column.
 */
const MONTH_TOKEN = new RegExp(
  // `(?!\d)` after the day matters: without it "august 2026" reads the "20"
  // of the year as a day number and the year is then lost entirely.
  `${MONTH_WORD}\\.?\\s*(?:(\\d{1,2})(?!\\d))?(?:st|nd|rd|th)?,?\\s*(20\\d{2})?`,
  'g',
)

/** "4/1/25 - 8/7/26" and "05/28/26-08/20/26". */
const NUMERIC_RANGE =
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*(?:to|through|until|till|[-–—])\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/

export interface Availability {
  /** ISO yyyy-mm-dd, first of the month unless the text gave a day. */
  from: string | null
  /** ISO yyyy-mm-dd, last day of the month unless the text gave a day. */
  to: string | null
  /** True when the end is past at `now` — the post is stale and must be fixed. */
  alreadyEnded: boolean
  /** True when the year came from the post date rather than the text itself.
   *  Worth saying out loud wherever these dates are shown to a person. */
  yearInferred: boolean
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
export function parseAvailability(
  raw: string | null | undefined,
  now = new Date(),
  /** When the post was published. A term with no year is read as the first
   *  one starting on or after this — "January to August" posted in October
   *  2025 is the Jan-Aug 2026 term, which is how a stale post becomes
   *  provably stale instead of merely unreadable. */
  postedAt?: string | Date | null,
): Availability | null {
  if (!raw) return null
  const text = raw.toLowerCase().trim()
  if (!text) return null

  const anchorRaw = postedAt ? new Date(postedAt) : null
  const anchor = anchorRaw && !Number.isNaN(anchorRaw.getTime()) ? anchorRaw : null

  // "4/1/25 - 8/7/26" — unambiguous, so it wins outright.
  const numeric = NUMERIC_RANGE.exec(text)
  if (numeric) {
    const [, m1, d1, y1, m2, d2, y2] = numeric
    const from = ymd(fullYear(y1), Number(m1) - 1, Number(d1))
    const to = ymd(fullYear(y2), Number(m2) - 1, Number(d2))
    if (!from || !to || to < from) return null
    return { from, to, alreadyEnded: to < today(now), yearInferred: false }
  }

  // Otherwise read every "Month [day] [year]" the text contains, in order.
  MONTH_TOKEN.lastIndex = 0
  const tokens: { month: number; day?: number; year?: number }[] = []
  for (const m of text.matchAll(MONTH_TOKEN)) {
    const month = MONTHS[m[1]]
    if (month === undefined) continue
    const day = m[2] ? Number(m[2]) : undefined
    tokens.push({
      month,
      day: day !== undefined && day >= 1 && day <= 31 ? day : undefined,
      year: m[3] ? Number(m[3]) : undefined,
    })
  }
  if (tokens.length === 0) return null

  // A year stated anywhere applies to whichever end lacks one: boards write
  // "January to August 2026" far more often than a year on each side.
  const statedYear = tokens.find(t => t.year !== undefined)?.year
  const anyYearStated = statedYear !== undefined

  /** The first time this month comes round on or after the post. */
  const inferYear = (month: number): number | null => {
    if (!anchor) return null
    const ay = anchor.getUTCFullYear()
    return month >= anchor.getUTCMonth() ? ay : ay + 1
  }

  const first = tokens[0]
  const second = tokens[1]

  if (second) {
    // The last year mentioned belongs to the END of the term.
    const endYear = second.year ?? statedYear ?? inferYear(second.month)
    if (endYear == null) return null
    // The start precedes the end, rolling back a year when it must.
    const startYear = first.year ?? (first.month > second.month ? endYear - 1 : endYear)

    const from = ymd(startYear, first.month, first.day ?? 1)
    const to = ymd(endYear, second.month, second.day ?? lastDayOfMonth(endYear, second.month))
    if (!from || !to || to < from) return null
    return { from, to, alreadyEnded: to < today(now), yearInferred: !anyYearStated }
  }

  const year = first.year ?? inferYear(first.month)
  if (year == null) return null
  const from = ymd(year, first.month, first.day ?? 1)
  if (!from) return null
  return { from, to: null, alreadyEnded: false, yearInferred: first.year === undefined }
}

const today = (now: Date) => now.toISOString().slice(0, 10)

/** "25" -> 2025, "2026" -> 2026. */
const fullYear = (raw: string) => (raw.length === 2 ? 2000 + Number(raw) : Number(raw))

/** Guards a nonsense day (Feb 31) rather than letting Date roll it silently. */
function ymd(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || month < 0 || month > 11) return null
  if (day < 1 || day > lastDayOfMonth(year, month)) return null
  return iso(year, month, day)
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

/** A sublet post left up this long, whose start has already passed, is a
 *  listing nobody has tended rather than an offer still open. Only applied
 *  when the text gave no end date — an explicit end is always believed. */
const STALE_POST_MONTHS = 9

/** `n` months before `now`, as yyyy-mm-dd. */
function monthsBefore(now: Date, n: number): string {
  const d = new Date(now)
  d.setUTCMonth(d.getUTCMonth() - n)
  return d.toISOString().slice(0, 10)
}

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
export function termHasEnded(
  raw: string | null | undefined,
  now = new Date(),
  postedAt?: string | Date | null,
): boolean {
  const parsed = parseAvailability(raw, now, postedAt)
  if (!parsed) return false

  const today = now.toISOString().slice(0, 10)

  // An end date the poster actually wrote is authoritative, whatever else is
  // true. An old post advertising a genuinely future term is still a real
  // offer, and must not be thrown away because the post itself is old.
  if (parsed.to) return parsed.to < today

  if (!parsed.from) return false

  // A start with no end: "August 2025" says nothing explicit about the finish,
  // but a sublet that began more than a year ago is not a current listing.
  if (parsed.from < monthsBefore(now, MAX_TERM_MONTHS)) return true

  // Nothing above proves it, so fall back to the age of the POST. A listing
  // sitting untouched for most of a year, advertising a start that has already
  // come and gone, is stale even though its end was never written down. Both
  // halves are required: an old post whose start is still ahead is a real
  // offer, and a recent post is no evidence of anything.
  const posted = postedAt ? new Date(postedAt) : null
  if (posted && !Number.isNaN(posted.getTime())) {
    const postDay = posted.toISOString().slice(0, 10)
    if (parsed.from < today && postDay < monthsBefore(now, STALE_POST_MONTHS)) return true
  }

  return false
}
