import type { ProspectStatus } from './gate.ts'

/** Table logic for /admin/universities — pure, so it is tested without a browser. */

export interface ProspectRowLite {
  id: string
  name: string
  country: string | null
  umich_units: string[]
  office_name: string | null
  contact_email: string | null
  contact_form_url: string | null
  confidence: 'verified' | 'likely' | 'not_found'
  status: ProspectStatus
  sent_at: string | null
}

export interface ProspectFilters {
  search: string
  country: string | 'all'
  status: ProspectStatus | 'all'
  /** email: has an address · form: contact form only · none: nothing */
  contact: 'all' | 'email' | 'form' | 'none'
  unit: string | 'all'
}

export const EMPTY_PROSPECT_FILTERS: ProspectFilters = { search: '', country: 'all', status: 'all', contact: 'all', unit: 'all' }

export const contactKindOf = (r: ProspectRowLite): 'email' | 'form' | 'none' =>
  r.contact_email ? 'email' : r.contact_form_url ? 'form' : 'none'

export function filterProspects(rows: ProspectRowLite[], f: ProspectFilters): ProspectRowLite[] {
  const q = f.search.trim().toLowerCase()
  return rows.filter(r => {
    if (f.country !== 'all' && r.country !== f.country) return false
    if (f.status !== 'all' && r.status !== f.status) return false
    if (f.contact !== 'all' && contactKindOf(r) !== f.contact) return false
    if (f.unit !== 'all' && !r.umich_units.includes(f.unit)) return false
    if (q) {
      const hay = [r.name, r.country, r.office_name, r.contact_email, r.umich_units.join(' ')].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export type ProspectSortKey = 'name' | 'country' | 'status' | 'confidence' | 'sent_at'
const STATUS_ORDER: Record<ProspectStatus, number> = { approved: 0, drafted: 1, researched: 2, sent: 3, replied: 4, declined: 5, skipped: 6 }
const CONF_ORDER = { verified: 0, likely: 1, not_found: 2 } as const

export function sortProspects(rows: ProspectRowLite[], key: ProspectSortKey, dir: 'asc' | 'desc'): ProspectRowLite[] {
  const sign = dir === 'asc' ? 1 : -1
  const val = (r: ProspectRowLite): string | number | null =>
    key === 'name' ? r.name.toLowerCase()
    : key === 'country' ? (r.country?.toLowerCase() ?? null)
    : key === 'status' ? STATUS_ORDER[r.status]
    : key === 'confidence' ? CONF_ORDER[r.confidence]
    : r.sent_at
  return rows
    .map((r, i) => ({ r, i, v: val(r) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.i - b.i
      if (a.v === null) return 1
      if (b.v === null) return -1
      return a.v < b.v ? -sign : a.v > b.v ? sign : a.i - b.i
    })
    .map(x => x.r)
}
