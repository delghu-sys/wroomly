import { parseAvailability, termHasEnded } from './prefill.ts'

/**
 * The leads table on /admin/agents, as data.
 *
 * Everything the table does — which rows a filter keeps, what a column sorts
 * by, what the CSV export contains — is a pure function here, so it can be
 * unit-tested without a browser and the component is only rendering.
 */

export type LeadStatus = 'new' | 'drafted' | 'contacted' | 'skipped'
/** email: outreach can write to them. handle: a manual message (Reddit).
 *  none: nothing published. */
export type ContactKind = 'email' | 'handle' | 'none'
/** What the post's own dates say at `now`. */
export type TermState = 'current' | 'ended' | 'unknown'

export interface LeadDbRow {
  id: string
  status: LeadStatus
  skip_reason: string | null
  title: string | null
  contact_email: string | null
  source: string
  source_url: string | null
  discovered_at: string
  outreach_sent_at: string | null
  import_request_id: string | null
  extracted: Record<string, unknown> | null
}

export interface LeadTableRow {
  id: string
  status: LeadStatus
  skipReason: string | null
  title: string
  source: string
  sourceUrl: string | null
  contactKind: ContactKind
  contactEmail: string | null
  /** e.g. "u/name" when the contact is a handle rather than an address. */
  contactHandle: string | null
  contactUrl: string | null
  contactName: string | null
  price: string | null
  /** Numeric rent for sorting; null when the post gave none. */
  priceNumber: number | null
  dates: string | null
  termState: TermState
  /** yyyy-mm-dd the post went up on its board, when known. */
  postedOn: string | null
  /** yyyy-mm-dd we first recorded it. */
  foundOn: string
  /** yyyy-mm-dd the outreach email went out. */
  emailedOn: string | null
  /** Set when a claimable draft exists — the title then links to it. */
  draftId: string | null
  /** The source board's own availability flag, e.g. "Available"/"Rented". */
  boardStatus: string | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const day = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function toLeadTableRow(row: LeadDbRow, now = new Date()): LeadTableRow {
  const x = row.extracted ?? {}
  const price = str(x.price)
  const priceDigits = price ? Number(price.replace(/[^0-9.]/g, '')) : NaN
  const dates = str(x.dates)
  const postedAt = str(x.postedAt)
  const contactHandle = str(x.contactHandle)

  let termState: TermState = 'unknown'
  if (dates) {
    if (termHasEnded(dates, now, postedAt)) termState = 'ended'
    else if (parseAvailability(dates, now, postedAt)) termState = 'current'
  }

  return {
    id: row.id,
    status: row.status,
    skipReason: row.skip_reason,
    title: row.title?.trim() || 'Untitled',
    source: row.source,
    sourceUrl: row.source_url,
    contactKind: row.contact_email ? 'email' : contactHandle ? 'handle' : 'none',
    contactEmail: row.contact_email,
    contactHandle,
    contactUrl: str(x.contactUrl),
    contactName: str(x.contactName) ?? str(x.posterName),
    price,
    priceNumber: Number.isFinite(priceDigits) && priceDigits > 0 ? priceDigits : null,
    dates,
    termState,
    postedOn: day(postedAt),
    foundOn: day(row.discovered_at) ?? row.discovered_at.slice(0, 10),
    emailedOn: day(row.outreach_sent_at),
    draftId: row.import_request_id ? row.id : null,
    boardStatus: str(x.boardStatus),
  }
}

// ── filtering ───────────────────────────────────────────────────────────────

export interface LeadFilters {
  /** Case-insensitive, matched against title, contact, name, source, dates,
   *  price and the skip reason. */
  search: string
  source: string | 'all'
  status: LeadStatus | 'all'
  contact: ContactKind | 'all'
  emailed: 'all' | 'yes' | 'no'
  term: TermState | 'all'
}

export const EMPTY_FILTERS: LeadFilters = {
  search: '',
  source: 'all',
  status: 'all',
  contact: 'all',
  emailed: 'all',
  term: 'all',
}

export function filterLeads(rows: LeadTableRow[], f: LeadFilters): LeadTableRow[] {
  const q = f.search.trim().toLowerCase()
  return rows.filter(r => {
    if (f.source !== 'all' && r.source !== f.source) return false
    if (f.status !== 'all' && r.status !== f.status) return false
    if (f.contact !== 'all' && r.contactKind !== f.contact) return false
    if (f.emailed === 'yes' && !r.emailedOn) return false
    if (f.emailed === 'no' && r.emailedOn) return false
    if (f.term !== 'all' && r.termState !== f.term) return false
    if (q) {
      const hay = [r.title, r.contactEmail, r.contactHandle, r.contactName, r.source, r.dates, r.price, r.skipReason, r.boardStatus]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// ── sorting ─────────────────────────────────────────────────────────────────

export type SortKey =
  | 'status'
  | 'title'
  | 'price'
  | 'dates'
  | 'contact'
  | 'source'
  | 'postedOn'
  | 'foundOn'
  | 'emailedOn'
export type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<LeadStatus, number> = { new: 0, drafted: 1, contacted: 2, skipped: 3 }

function sortValue(r: LeadTableRow, key: SortKey): string | number | null {
  switch (key) {
    case 'status': return STATUS_ORDER[r.status]
    case 'title': return r.title.toLowerCase()
    case 'price': return r.priceNumber
    case 'dates': return r.dates?.toLowerCase() ?? null
    case 'contact': return (r.contactEmail ?? r.contactHandle)?.toLowerCase() ?? null
    case 'source': return r.source
    case 'postedOn': return r.postedOn
    case 'foundOn': return r.foundOn
    case 'emailedOn': return r.emailedOn
  }
}

/** Stable sort; rows with no value for the column always sink to the bottom,
 *  whichever direction is chosen — an empty price is not "cheapest". */
export function sortLeads(rows: LeadTableRow[], key: SortKey, dir: SortDir): LeadTableRow[] {
  const sign = dir === 'asc' ? 1 : -1
  return rows
    .map((r, i) => ({ r, i, v: sortValue(r, key) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.i - b.i
      if (a.v === null) return 1
      if (b.v === null) return -1
      if (a.v < b.v) return -1 * sign
      if (a.v > b.v) return 1 * sign
      return a.i - b.i
    })
    .map(x => x.r)
}

// ── export ──────────────────────────────────────────────────────────────────

const CSV_COLUMNS: [string, (r: LeadTableRow) => string | null][] = [
  ['status', r => r.status],
  ['listing', r => r.title],
  ['price', r => r.price],
  ['dates', r => r.dates],
  ['term', r => r.termState],
  ['contact_email', r => r.contactEmail],
  ['contact_handle', r => r.contactHandle],
  ['contact_name', r => r.contactName],
  ['source', r => r.source],
  ['source_url', r => r.sourceUrl],
  ['board_status', r => r.boardStatus],
  ['posted_on', r => r.postedOn],
  ['found_on', r => r.foundOn],
  ['emailed_on', r => r.emailedOn],
  ['skip_reason', r => r.skipReason],
]

const csvCell = (v: string | null) => {
  if (v === null) return ''
  // A cell starting with = + - @ is executed as a formula by Excel; prefix it.
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** RFC 4180, with the header row, in the order the rows are given. */
export function leadsToCsv(rows: LeadTableRow[]): string {
  const lines = [CSV_COLUMNS.map(([h]) => h).join(',')]
  for (const r of rows) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(r))).join(','))
  return lines.join('\r\n') + '\r\n'
}
