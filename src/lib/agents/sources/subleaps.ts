import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'
import { fetchHtml, inAnnArborArea, platformExtracted, priceText, shortText, sleep, termText } from './platform-shared.ts'

/**
 * Source: SubLeaps' Ann Arbor and U-M pages (subleaps.com/subleases/...).
 *
 * SubLeaps is a student sublease site. Its Ann Arbor and "umich" pages are
 * server-rendered, and the listing records ride along in the page's Next.js
 * payload: title, description, monthly rent, start and end dates, bedrooms,
 * town, status and the date posted. The "host" is an opaque id, never a name
 * or address, and messaging runs through the site, so these leads are
 * link-only, for a manual message. One page carries every record, so there is
 * no per-listing fetch.
 *
 * robots.txt allows `*` and disallows named AI-training crawlers; this is not
 * one of them and reads listings only to find sublets, which the file's own
 * content signals (search: yes) permit. The `www.` host was down when this was
 * written; the bare domain works.
 */

const PAGES = ['https://subleaps.com/subleases/ann-arbor-mi', 'https://subleaps.com/subleases/umich']
const PAUSE_MS = 1000

export interface SubleapsRecord {
  id: string
  title: string
  description: string | null
  price_per_month: number | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string | null
  beds: number | null
  baths: number | null
  address_city: string | null
  address_state: string | null
}

/** The page's Next.js flight data, decoded. Chunks are string literals pushed
 *  to `self.__next_f`; joined, a record that straddles two chunks is whole. */
function flightData(html: string): string {
  let out = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      out += JSON.parse(`"${m[1]}"`) as string
    } catch {
      /* skip a chunk that is not a plain string */
    }
  }
  return out
}

/** The brace-balanced object starting at `start`, ignoring braces in strings. */
function objectAt(s: string, start: number): string | null {
  let depth = 0
  let inStr = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return s.slice(start, i + 1)
  }
  return null
}

/** Pure: a SubLeaps page → its listing records, de-duplicated by id. */
export function parsePage(html: string): SubleapsRecord[] {
  const data = flightData(html)
  const out = new Map<string, SubleapsRecord>()
  for (const m of data.matchAll(/"price_per_month"/g)) {
    const start = data.lastIndexOf('{"id"', m.index)
    if (start === -1) continue
    const raw = objectAt(data, start)
    if (!raw) continue
    try {
      const r = JSON.parse(raw) as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.title !== 'string') continue
      out.set(r.id, {
        id: r.id,
        title: r.title.trim(),
        description: typeof r.description === 'string' ? r.description : null,
        price_per_month: typeof r.price_per_month === 'number' ? r.price_per_month : null,
        status: typeof r.status === 'string' ? r.status : '',
        start_date: typeof r.start_date === 'string' ? r.start_date : null,
        end_date: typeof r.end_date === 'string' ? r.end_date : null,
        created_at: typeof r.created_at === 'string' ? r.created_at : null,
        beds: typeof r.beds === 'number' ? r.beds : null,
        baths: typeof r.baths === 'number' ? r.baths : null,
        address_city: typeof r.address_city === 'string' ? r.address_city : null,
        address_state: typeof r.address_state === 'string' ? r.address_state : null,
      })
    } catch {
      /* not a record */
    }
  }
  return [...out.values()]
}

export function toLead(r: SubleapsRecord): RawLead {
  const url = `https://subleaps.com/listings/${r.id}`
  const active = r.status.toUpperCase() === 'ACTIVE'
  const local = inAnnArborArea(r.address_city)
  return {
    sourceExternalId: r.id,
    sourceUrl: url,
    title: r.title || 'Sublease',
    extracted: platformExtracted({
      channel: 'subleaps',
      platformName: 'SubLeaps',
      url,
      price: priceText(r.price_per_month),
      dates: termText(r.start_date, r.end_date),
      postedAt: r.created_at,
      description: shortText(r.description),
      boardStatus: active ? 'Active' : r.status || undefined,
      beds: r.beds,
      baths: r.baths,
    }),
    skip: !active
      ? `listing is ${r.status.toLowerCase() || 'not active'}`
      : !local
        ? `not in the Ann Arbor area (${[r.address_city, r.address_state].filter(Boolean).join(', ') || 'unknown town'})`
        : undefined,
  }
}

export const subleaps: SourceAdapter = {
  key: 'subleaps-a2',
  label: 'SubLeaps (Ann Arbor)',
  contactBasis:
    'Students post a sublease publicly so other students can find and message them. The site publishes no email or phone, so these leads link to the listing for one manual message there; the outreach agent never emails anyone from here.',

  async fetchLeads({ knownIds }: FetchContext = {}) {
    const records = new Map<string, SubleapsRecord>()
    const errors: string[] = []
    for (const [i, page] of PAGES.entries()) {
      if (i > 0) await sleep(PAUSE_MS)
      try {
        for (const r of parsePage(await fetchHtml(page))) records.set(r.id, r)
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    // One page failing keeps the other's listings; nothing at all is an error.
    if (errors.length === PAGES.length) throw new Error(errors.join('; '))
    return [...records.values()].filter(r => !knownIds?.has(r.id)).map(toLead)
  },
}
