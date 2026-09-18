import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'

/**
 * Source: University of Michigan sublet posts on offcampus-universe.com.
 *
 * WHAT THIS TAKES, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * It records that a sublet exists, with its title, price, lease type and a link
 * to the post. It does NOT take the lister's email, so every lead from this
 * source arrives with no contact and the outreach agent skips it as
 * `no-contact-email` — by design, not by accident.
 *
 * The reason is a deliberate choice by the site's operator. A lister's address
 * is not printed on the page: it sits in the page's JavaScript payload behind a
 * "Show" button, and each listing record carries `showEmailClicks` /
 * `showPhoneClicks` counters. They gate the reveal and they meter it. That is
 * materially different from the CMB resident board, where residents print their
 * own address on a page whose purpose is to receive enquiries — there,
 * publishing IS the invitation. Lifting the address out of the payload here
 * would be working around the operator's gate, so this adapter does not.
 *
 * The practical result is still useful: a queue of real, current U-M sublets
 * that a human can open and respond to through the site's own contact flow.
 * If that posture should change — a data partnership with Off Campus Universe,
 * say — the place to change it is here, and `contactBasis` below must change
 * with it.
 *
 * SUBLETS ONLY. Every listing page's meta description begins with its lease
 * type; the values on this board are "Sub Lease", "Year Lease (12 Months)",
 * "Biannual lease (6 months)" and "1 month or longer". Only a sub-lease is
 * someone handing off a place they already hold; the rest are landlords and
 * agents advertising inventory, which is not who this pipeline is for.
 *
 * HOW IT IS POLITE. robots.txt disallows only member areas, profiles and group
 * chats — listing pages are permitted and marked `robots: index` (checked
 * 2026-09-18). The browsable index is client-rendered, but every detail page is
 * server-rendered, so: read the sitemap for every U-M listing URL, drop the
 * ones already held BEFORE fetching anything, then fetch the remainder newest
 * first under a hard request cap, pausing between each. Detail pages are ~2.4 MB,
 * so the cap is not a formality.
 */

const ORIGIN = 'https://www.offcampus-universe.com'
// The `apartment-listings` dynamic-page role. This sitemap holds every listing
// on the site across universities; the UUID is the pageRole from the site's own
// routing config, and is the thing most likely to change if Wix rebuilds it.
const SITEMAP_URL = `${ORIGIN}/dynamic-university_p_eaa6fd57_3c8b_4e6a_b4b2_752899d40f85_0_5000-sitemap.xml`
const UMICH_PATH = '/university/university-of-michigan/apartment-listings/'
const UA = 'WroomlyBot/1.0 (+https://wroomly.app)'

export interface ListingUrl {
  /** The URL slug. Used as the dedupe key: unique per listing and stable,
   *  unlike a trailing UUID — only about half the slugs carry one, the rest
   *  end in the poster's name. */
  id: string
  url: string
}

/** Every U-M listing URL in the sitemap. Pure. */
export function umichListingUrls(sitemapXml: string): ListingUrl[] {
  const out: ListingUrl[] = []
  const seen = new Set<string>()
  for (const loc of sitemapXml.match(/<loc>([^<]*)<\/loc>/g) ?? []) {
    const url = loc.replace(/<\/?loc>/g, '').trim()
    const at = url.indexOf(UMICH_PATH)
    if (at < 0) continue
    const id = url.slice(at + UMICH_PATH.length).replace(/[/?#].*$/, '').toLowerCase()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ id, url })
  }
  return out
}

export interface ListingFacts {
  title?: string
  leaseType?: string
  price?: string
}

/**
 * Read the facts the page renders server-side for itself.
 *
 * Only `<title>` and `<meta name="description">` are used, because those two
 * are unambiguously about THIS listing. The page also embeds dozens of
 * neighbouring records in its JS payload, and picking through those risks
 * attributing another listing's details to this URL.
 */
export function parseListingFacts(html: string): ListingFacts {
  const head = html.slice(0, 200_000)
  const rawTitle = head.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
  // "<listing> | <City> Universe Housing"
  const title = rawTitle ? rawTitle.split(' | ')[0].trim() || undefined : undefined

  const desc = head.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]
  // "{leaseType} apartment at {title}, listed at ${price} on {site} Housing"
  const m = desc?.match(/^\s*(.+?)\s+apartment at\s+.*?,\s*listed at\s*\$\s*([\d,]+)/i)

  return { title, leaseType: m?.[1]?.trim(), price: m?.[2]?.replace(/,/g, '') }
}

/** Only a sub-lease is a student handing off a place they already hold. */
export function isSublet(leaseType: unknown): boolean {
  return typeof leaseType === 'string' && /\bsub[\s-]?le(ase|t)/i.test(leaseType)
}

/** Page → lead, or null when it isn't a sublet. Facts and a link only. */
export function toLead(html: string, { id, url }: ListingUrl): RawLead | null {
  const facts = parseListingFacts(html)
  if (!isSublet(facts.leaseType)) return null
  return {
    sourceExternalId: id,
    sourceUrl: url,
    title: facts.title ?? 'Sublet near U-M',
    // No contactEmail on purpose — see the note at the top of this file.
    extracted: {
      leaseType: facts.leaseType,
      price: facts.price,
      contactVia: url,
      contactNote:
        'This board hides and meters the lister’s email behind a “Show” click, so we do not take it. Open the listing to contact them through the site.',
    },
  }
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

export const offcampusUniverse: SourceAdapter = {
  key: 'offcampus-universe-umich',
  label: 'Off Campus Universe — U-M sublets',
  contactBasis:
    'Public university housing board. We record that a sublet exists and link to it; we do NOT take the lister’s email, because this board gates and meters contact reveals behind a “Show” click. Leads from here carry no contact and are never emailed.',

  async fetchLeads(ctx: FetchContext = {}) {
    const { knownIds, maxFetches = 40 } = ctx

    const all = umichListingUrls(await getText(SITEMAP_URL))
    // Skip what we already hold BEFORE fetching. Sitemaps list newest last, so
    // reverse to see the freshest postings first when the cap bites.
    const todo = all.filter(l => !knownIds?.has(l.id)).reverse().slice(0, maxFetches)

    const leads: RawLead[] = []
    for (const listing of todo) {
      try {
        const lead = toLead(await getText(listing.url), listing)
        if (lead) leads.push(lead) // null = not a sublet
      } catch {
        // One bad page must not abort the run.
      }
      // Deliberate pacing: these pages are megabytes, on someone else's site.
      await new Promise(r => setTimeout(r, 400))
    }
    return leads
  },
}
