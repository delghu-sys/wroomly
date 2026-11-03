import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'
import { fetchHtml, inAnnArborArea, jsonLdBlocks, ldOfType, platformExtracted, priceText, shortText, sleep, termText } from './platform-shared.ts'

/**
 * Source: Ohana's "A2 Sublets" page (liveohana.ai/sublet/ann-arbor-mi).
 *
 * Ohana is a sublet and short-term furnished housing marketplace. Its search
 * pages and listing pages carry schema.org data: price per month, the window
 * the place is available, bedrooms and the town. Hosts are not named and no
 * email or phone is shown; messaging runs through Ohana, so these leads are
 * link-only, for a manual message.
 *
 * READ THIS BEFORE ENABLING. Ohana's terms of use say, in these words,
 * "Scraping Ohana's websites is strictly prohibited," and name crawlers and
 * automatic devices. Its robots.txt allows listing pages, and this adapter
 * reads only public pages at a low rate with an honest User-Agent, but the
 * terms are the same kind of restriction that put Craigslist off the list of
 * sources. The adapter is registered, but nothing runs unless `ohana-a2` is
 * named in AGENT_SOURCES. Enabling it is a decision about that risk.
 */

const BASE = 'https://liveohana.ai'
const INDEX = `${BASE}/sublet/ann-arbor-mi`
const DEFAULT_MAX_DETAIL = 20
const PAUSE_MS = 1000

/** Pure: the search page → listing urls. The slug is Ohana's stable id. */
export function parseIndex(html: string): { id: string; url: string }[] {
  const list = ldOfType(html, 'ItemList')
  const els = Array.isArray(list?.itemListElement) ? (list.itemListElement as Record<string, unknown>[]) : []
  const out: { id: string; url: string }[] = []
  const seen = new Set<string>()
  for (const el of els) {
    const url = typeof el.url === 'string' ? el.url : typeof (el.item as Record<string, unknown> | undefined)?.url === 'string' ? ((el.item as Record<string, unknown>).url as string) : null
    const id = url?.match(/\/listing\/([^/?#]+)/)?.[1]
    if (!url || !id || seen.has(id)) continue
    seen.add(id)
    out.push({ id: decodeURIComponent(id), url })
  }
  return out
}

/** Pure: a listing page → a lead. Null when it carries no offer data. */
export function toLead(html: string, id: string, url: string): RawLead | null {
  const offer = jsonLdBlocks(html).find(b => b['@type'] === 'Offer')
  if (!offer) return null
  const item = (offer.itemOffered ?? {}) as Record<string, unknown>
  const addr = (item.address ?? {}) as Record<string, unknown>
  const city = [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ')
  const local = inAnnArborArea(addr.addressLocality)
  const title = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Sublet in Ann Arbor'

  return {
    sourceExternalId: id,
    sourceUrl: url,
    title,
    extracted: platformExtracted({
      channel: 'ohana',
      platformName: 'Ohana',
      url,
      price: priceText(offer.price),
      dates: termText(offer.availabilityStarts, offer.availabilityEnds),
      description: shortText(item.description),
      boardStatus: 'Available',
      beds: item.numberOfBedrooms,
      baths: item.numberOfBathroomsTotal,
    }),
    skip: local ? undefined : `not in the Ann Arbor area (${city || 'unknown town'})`,
  }
}

export const ohana: SourceAdapter = {
  key: 'ohana-a2',
  label: 'Ohana (A2 Sublets)',
  contactBasis:
    'Hosts list a sublet publicly so renters can find and message them. The site publishes no email or phone, so these leads link to the listing for one manual message there; the outreach agent never emails anyone from here. Ohana’s terms prohibit scraping: enable on purpose.',

  async fetchLeads({ knownIds, maxFetches }: FetchContext = {}) {
    const unknown = parseIndex(await fetchHtml(INDEX)).filter(it => !knownIds?.has(it.id))
    const leads: RawLead[] = []
    // Listing pages are large (a few hundred KB), hence the lower default cap.
    for (const [i, it] of unknown.slice(0, maxFetches ?? DEFAULT_MAX_DETAIL).entries()) {
      if (i > 0) await sleep(PAUSE_MS)
      try {
        const lead = toLead(await fetchHtml(it.url), it.id, it.url)
        if (lead) leads.push(lead)
      } catch {
        /* stays retryable */
      }
    }
    return leads
  },
}
