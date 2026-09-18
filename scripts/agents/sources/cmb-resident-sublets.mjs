/**
 * Source: residents' own sublet posts on annarborapartments.net/sublet/.
 *
 * WHY THIS IS IN SCOPE, given scrapeCMB.mjs deliberately excludes this page.
 * That exclusion was right for THAT pipeline: it imports CMB's managed
 * inventory, and republishing residents' personal posts under "CMB Management"
 * would misattribute them and expose contact details without consent. This
 * pipeline is different in the way that matters — nothing here is ever
 * published. A lead becomes a PENDING draft that only the resident can make
 * live by claiming it, and the one email we send is an offer they can ignore
 * or permanently opt out of. The page exists so residents can be contacted
 * about their sublet; the ones with an address published it for that purpose.
 * Hugo re-scoped this deliberately on 2026-09-18, after being shown the
 * earlier exclusion.
 *
 * We take facts and a link. We never copy their photos.
 */

const SOURCE_URL = 'https://annarborapartments.net/sublet/'
const OFFICE_DOMAIN = 'annarborapartments.net'

const strip = s =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Pure parser, exported separately from the fetch so it can be tested against a
 * fixture. That keeps the test suite from ever pulling real residents' contact
 * details into memory just to prove the parsing is correct.
 */
export function parseSubletTable(html) {
  const table = (html.match(/<table[\s\S]*?<\/table>/g) ?? []).find(t => t.includes('@'))
  if (!table) return []

  const leads = []
  for (const row of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(strip)
    if (cells.length < 6) continue

    const [name, contact, property, dates, unitType, price, notes = ''] = cells
    if (!name || /^name$/i.test(name)) continue // header row
    if (!property || /fully leased/i.test(notes)) continue

    // Only a PERSONAL address counts as an invitation to contact. Rows that
    // list the leasing office's number or address are residents who chose to
    // route enquiries through management — we still record the lead, but with
    // no contact, so the outreach policy skips it as `no-contact-email`.
    const match = contact.match(/[^\s<>()]+@[^\s<>()]+\.[a-z]{2,}/i)
    const email =
      match && !match[0].toLowerCase().endsWith(OFFICE_DOMAIN)
        ? match[0].toLowerCase()
        : undefined

    leads.push({
      // The board carries no unit numbers, so identity is poster + place +
      // dates. Stable across runs, which is what makes discovery idempotent
      // and guarantees nobody is contacted twice.
      sourceExternalId: `${name}|${property}|${dates}`.toLowerCase().replace(/\s+/g, ' '),
      sourceUrl: SOURCE_URL,
      title: `${unitType || 'Sublet'} at ${property}`,
      contactEmail: email,
      extracted: { posterName: name, property, dates, unitType, price, notes },
    })
  }
  return leads
}

export const adapter = {
  key: 'cmb-resident-sublets',
  label: 'CMB resident sublet board',
  contactBasis:
    'Residents publish their own sublet and their own contact details on a public page whose stated purpose is to receive sublet enquiries.',

  async fetchLeads() {
    const res = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'WroomlyBot/1.0 (+https://wroomly.app)' },
    })
    if (!res.ok) throw new Error(`${SOURCE_URL} -> HTTP ${res.status}`)
    return parseSubletTable(await res.text())
  },
}

export default adapter
