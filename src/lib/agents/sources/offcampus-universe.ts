import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'

/**
 * Source: University of Michigan sublet posts on offcampus-universe.com.
 *
 * WHAT THIS TAKES, AND THE JUDGEMENT BEHIND IT.
 *
 * It records that a sublet exists — title, price, lease type, a link — and the
 * poster's email, so the outreach agent can offer them a draft.
 *
 * Be clear about what that means, because it differs from the CMB board. There,
 * residents PRINT their address on a page whose purpose is to receive enquiries:
 * publishing it is the invitation. Here the address is not displayed. It sits in
 * the page's JavaScript payload behind a "Show" button, and each record carries
 * `showEmailClicks` / `showPhoneClicks` counters — the operator gates the reveal
 * and meters it. Reading the address out of the payload bypasses that gate.
 *
 * Hugo was shown this distinction on 2026-09-18 and decided to proceed anyway.
 * Recording it here so the judgement travels with the code rather than living in
 * a chat log: this is a deliberate choice, not an oversight, and it is the thing
 * to revisit first if Off Campus Universe ever objects or a partnership is
 * offered. The mitigations that make it defensible are unchanged and load-
 * bearing — nothing is published, one email per person ever, permanent opt-out.
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

export interface ListingContact {
  email?: string
  contactName?: string
  /** "Student" on resident posts, other values on agent/owner posts. */
  formType?: string
  /** e.g. "January - May" — the poster's own description of the dates. */
  timingOfLease?: string
  bedrooms?: string
  bathrooms?: string
}

/** Brace-match the object containing `at`, ignoring braces inside strings. */
function objectAround(text: string, at: number): string | null {
  let start = -1
  let depth = 0
  for (let i = at; i >= 0 && at - i < 40_000; i--) {
    const c = text[i]
    if (c === '}') depth++
    else if (c === '{') {
      if (depth === 0) { start = i; break }
      depth--
    }
  }
  if (start < 0) return null

  depth = 0
  let inStr = false
  for (let i = start; i < text.length && i - start < 120_000; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Pull the poster's contact out of the page's embedded record.
 *
 * The payload is JSON string-escaped into the HTML at an inconsistent depth, so
 * parsing it as JSON is unreliable — instead we read fields directly, with the
 * escaping collapsed first (see below).
 *
 * Staying inside the RIGHT record is the whole problem, and it took two failed
 * approaches to get right:
 *
 *   1st attempt — anchor on the record's own `title` field. Wrong: the listing
 *   title isn't stored under a `title` key at all; that key appears 400+ times
 *   per page for unrelated things. Passed a fixture that only *looked* right,
 *   then extracted nothing from a real page.
 *
 *   2nd attempt — anchor on `"slug":"<url-slug>"`. Half right: about half of
 *   real listings have a URL whose slug differs from the record's own `slug`
 *   field (the friendly URL and the stored slug can diverge), so this matched
 *   nothing for that half. Where it DID match something, it could just as
 *   easily have matched a different `slug` field belonging to a nested image
 *   object — the guard below caught that (no `typeOfLease` on an image object)
 *   and correctly returned nothing rather than the wrong contact, but "return
 *   nothing" for half of real listings is still a bug worth fixing.
 *
 * What actually works: Wix embeds the CURRENT dynamic page's own item at a
 * fixed, structural location — `"recordsByCollectionId":{"ApartmentListings":
 * {"<id>":{ ...this listing's own record... }}}` — and the page's own routing
 * config sets `pageSize: 1` for that collection, so exactly one record lives
 * there. This needs no value to match against; it identifies the record by
 * WHERE it is, not by hoping some field equals something we already know.
 *
 * Two defences remain, both load-bearing:
 *   1. require `typeOfLease` on the matched object — only ApartmentListings
 *      records have it, so the `RoommateProfiles` collection (personal emails
 *      of students LOOKING for a room — must never be contacted) can't satisfy
 *      it even if the structural anchor were ever wrong;
 *   2. cross-check the record's own `price` against the price this SAME page
 *      states in its `<meta description>` (parsed independently, from plain
 *      HTML, by `parseListingFacts`). A mismatch means the anchor found the
 *      wrong thing, and we return nothing rather than risk emailing a
 *      stranger about someone else's flat — the worst failure this pipeline
 *      could have.
 */
export function extractContact(html: string, expectedPrice?: string): ListingContact {
  // Collapse ANY run of backslashes before a quote or slash. The payload is
  // escaped unevenly — quotes arrive as \" but slashes as \\/ — so handling
  // exactly one level leaves a stray backslash mid-value and nothing matches.
  // This does corrupt quotes escaped INSIDE a value, which is why fields are
  // read with regexes below rather than JSON.parse (which fails on this input).
  const flat = html.replace(/\\+"/g, '"').replace(/\\+\//g, '/')

  const marker = '"recordsByCollectionId":{"ApartmentListings":{"'
  const markerAt = flat.indexOf(marker)
  if (markerAt < 0) return {}
  // Right after the marker is `<id>":{` — the record's own opening brace.
  const braceAt = flat.indexOf('{', markerAt + marker.length)
  if (braceAt < 0) return {}

  const record = objectAround(flat, braceAt)
  if (!record || !/"typeOfLease":"/.test(record)) return {}

  const read = (name: string): string | undefined =>
    record.match(new RegExp(`"${name}":"([^"]{1,160})"`))?.[1]?.trim() || undefined
  const readNum = (name: string): string | undefined =>
    read(name) ?? record.match(new RegExp(`"${name}":([0-9.]{1,8})`))?.[1]

  const recordPrice = readNum('price')
  if (expectedPrice && recordPrice && recordPrice !== expectedPrice) return {}

  const email = read('email')?.toLowerCase()
  return {
    email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : undefined,
    contactName: read('contactName'),
    formType: read('formType'),
    timingOfLease: read('timingOfLease'),
    bedrooms: readNum('bedroom'),
    bathrooms: readNum('bathroom'),
  }
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

/** Page → lead, or null when it isn't a sublet. Facts, a contact, and a link. */
export function toLead(html: string, { id, url }: ListingUrl): RawLead | null {
  const facts = parseListingFacts(html)
  if (!isSublet(facts.leaseType)) return null

  const contact = extractContact(html, facts.price)
  return {
    sourceExternalId: id,
    sourceUrl: url,
    title: facts.title ?? 'Sublet near U-M',
    contactEmail: contact.email,
    extracted: {
      leaseType: facts.leaseType,
      price: facts.price,
      dates: contact.timingOfLease,
      bedrooms: contact.bedrooms,
      bathrooms: contact.bathrooms,
      contactName: contact.contactName,
      // "Student" vs an agent/owner post — worth knowing before writing to them.
      posterType: contact.formType,
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
    'Students advertise a sublet on a public university housing board and enter a contact email so people can reach them about it. Note: this board does not display that address — it is behind a “Show” click the operator counts — so we read it from the page payload. Reviewed and chosen deliberately (2026-09-18).',

  async fetchLeads(ctx: FetchContext = {}) {
    // Small on purpose. The admin console runs this inside a serverless
    // function capped at 60s total (see api/admin/agents/route.ts), and each
    // detail page is ~2.4MB — a batch of 40 measured well over 2 minutes
    // locally with no other load, which is exactly the "Run failed" a full
    // batch produced in practice. Discovery is idempotent (knownIds), so a
    // smaller batch just means the backlog clears over a few runs instead of
    // one — which is also kinder to someone else's site than a 40-page burst.
    const { knownIds, maxFetches = 10 } = ctx
    // Second, independent guard: stop early if we're approaching the time
    // budget, so an unusually slow network degrades to fewer results instead
    // of the whole request being killed with nothing returned.
    const budgetMs = 45_000
    const startedAt = Date.now()

    const all = umichListingUrls(await getText(SITEMAP_URL))
    // Skip what we already hold BEFORE fetching. Sitemaps list newest last, so
    // reverse to see the freshest postings first when the cap bites.
    const todo = all.filter(l => !knownIds?.has(l.id)).reverse().slice(0, maxFetches)

    const leads: RawLead[] = []
    for (const listing of todo) {
      if (Date.now() - startedAt > budgetMs) break
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
