import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'
import { fetchHtml, inAnnArborArea, ldOfType, platformExtracted, priceText, shortText, sleep, termText } from './platform-shared.ts'

/**
 * Source: furnished sublets listed on RotatingRoom's Ann Arbor page.
 *
 * RotatingRoom is a housing marketplace for short stays (travelling
 * professionals, interns, students). Each listing page carries schema.org
 * data for search engines: price, availability window, bedrooms and a
 * coordinate. It does NOT show the host's name, email or phone; messaging runs
 * through the site, so these leads are link-only, for a manual message.
 *
 * Its "Ann Arbor" page also lists nearby towns (a Macomb listing turned up in
 * a first look), so every listing is checked against the service area and the
 * others are recorded as skipped rather than imported.
 *
 * Polite by construction: robots.txt allows everything and names no limit, the
 * User-Agent identifies us, index pages are few (about 20 listings each), and
 * a listing already held is never fetched again.
 */

const BASE = 'https://rotatingroom.com'
const INDEX = `${BASE}/sublets/ann-arbor-mi`
const PER_PAGE = 20
const MAX_INDEX_PAGES = 6
const DEFAULT_MAX_DETAIL = 40
const PAUSE_MS = 500

export interface IndexParse {
  /** RotatingRoom's own listing id (the number in /need-a-room/<id>). */
  items: { id: string; url: string }[]
  total: number | null
}

/** Pure: an index page → the listing links and how many the site says exist. */
export function parseIndex(html: string): IndexParse {
  const list = ldOfType(html, 'ItemList')
  const els = Array.isArray(list?.itemListElement) ? (list.itemListElement as Record<string, unknown>[]) : []
  const items: { id: string; url: string }[] = []
  const seen = new Set<string>()
  for (const el of els) {
    const url = typeof el.url === 'string' ? el.url : null
    const id = url?.match(/\/need-a-room\/(\d+)/)?.[1]
    if (url && id && !seen.has(id)) {
      seen.add(id)
      items.push({ id, url })
    }
  }
  const total = typeof list?.numberOfItems === 'number' ? list.numberOfItems : null
  return { items, total }
}

/** Pure: a listing page + its id and url → a lead. Null when the page carries
 *  no listing data at all (a bad fetch must stay retryable, not be recorded). */
export function toLead(html: string, id: string, url: string): RawLead | null {
  const a = ldOfType(html, 'Accommodation')
  if (!a) return null
  const offers = (a.offers ?? {}) as Record<string, unknown>
  const addr = (a.address ?? {}) as Record<string, unknown>
  const geo = (a.geo ?? {}) as Record<string, unknown>
  const city = [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ')
  const title = typeof a.name === 'string' && a.name.trim() ? a.name.trim() : 'Furnished sublet'
  const local = inAnnArborArea(addr.addressLocality, geo.latitude, geo.longitude)
  const out = offers.availability
  const unavailable = typeof out === 'string' && /OutOfStock|SoldOut|Discontinued/i.test(out)

  return {
    sourceExternalId: id,
    sourceUrl: url,
    title: city && !local ? `${title} (${city})` : title,
    extracted: platformExtracted({
      channel: 'rotatingroom',
      platformName: 'RotatingRoom',
      url,
      price: priceText(offers.price),
      dates: termText(offers.availabilityStarts, offers.availabilityEnds),
      description: shortText(a.description),
      boardStatus: unavailable ? 'Unavailable' : 'Available',
      beds: a.numberOfBedrooms,
      baths: a.numberOfBathroomsTotal,
    }),
    skip: !local ? `not in the Ann Arbor area (${city || 'unknown town'})` : unavailable ? 'listing marked unavailable' : undefined,
  }
}

export const rotatingRoom: SourceAdapter = {
  key: 'rotatingroom-a2',
  label: 'RotatingRoom (Ann Arbor)',
  contactBasis:
    'Hosts list a furnished place publicly so renters can find and message them. The site publishes no email or phone, so these leads link to the listing for one manual message there; the outreach agent never emails anyone from here.',

  async fetchLeads({ knownIds, maxFetches }: FetchContext = {}) {
    const unknown: { id: string; url: string }[] = []
    const seen = new Set<string>()
    let total: number | null = null
    for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
      if (page > 1) await sleep(PAUSE_MS)
      const { items, total: t } = parseIndex(await fetchHtml(`${INDEX}?page=${page}`))
      total ??= t
      let added = 0
      for (const it of items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        added++
        if (!knownIds?.has(it.id)) unknown.push(it)
      }
      // Stop once a page adds nothing new, or we have the count the site gave.
      if (added === 0 || (total !== null && seen.size >= total) || items.length < PER_PAGE) break
    }

    const leads: RawLead[] = []
    for (const [i, it] of unknown.slice(0, maxFetches ?? DEFAULT_MAX_DETAIL).entries()) {
      if (i > 0) await sleep(PAUSE_MS)
      try {
        const lead = toLead(await fetchHtml(it.url), it.id, it.url)
        if (lead) leads.push(lead)
      } catch {
        /* one unreachable listing stays retryable; the others still count */
      }
    }
    return leads
  },
}
