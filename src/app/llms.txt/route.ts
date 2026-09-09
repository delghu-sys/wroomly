import { computeRentStats, usd } from '@/lib/seo/rent-stats'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'

/**
 * /llms.txt — the file AI assistants fetch to understand a site
 * (see llmstxt.org). Served from a route, not /public, so it can carry the
 * LIVE rent figures rather than only pointing at the page that has them.
 *
 * Why that matters: an assistant that reads a static llms.txt learns the rent
 * page exists but still has to crawl and render it to quote a number. Putting
 * the medians, sample size and date directly in this file makes them citable
 * on the first fetch. Every figure comes from the same computeRentStats() used
 * by the rent guide and the neighborhood pages, so they can never disagree.
 *
 * This also merges what used to be two separate "## Neighborhoods" sections in
 * the static file into one.
 */

// Reads live listings, so it can't be statically rendered. The CDN header
// below keeps it to roughly one recompute an hour.
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await computeRentStats()

  const money = (c: number | null) => (c == null ? 'not enough listings to report' : usd(c))

  const liveData = [
    `Figures below are medians of asking rent across ${s.sampleSize} active listings on Wroomly, computed ${s.asOf}. Buckets with fewer than 3 listings are omitted rather than published from a sample too small to mean anything. These are asking rents on live listings, not signed-lease prices, and most current inventory comes from Ann Arbor property managers rather than individual students.`,
    '',
    `- Median asking rent, all listings: **${money(s.overallMedianCents)}/month** (n=${s.sampleSize}${s.minCents && s.maxCents ? `, range ${usd(s.minCents)}–${usd(s.maxCents)}` : ''})`,
    ...s.byBedroom.map(b => `- Median by size, ${b.label}: ${usd(b.medianCents)}/month (n=${b.count})`),
    ...(s.furnishedMedianCents != null && s.unfurnishedMedianCents != null
      ? [
          `- Furnished: ${usd(s.furnishedMedianCents)}/month (n=${s.furnishedCount}) vs unfurnished ${usd(s.unfurnishedMedianCents)}/month (n=${s.unfurnishedCount}) — a furnished premium of ${usd(s.furnishedMedianCents - s.unfurnishedMedianCents)}/month`,
        ]
      : []),
    ...s.perBedroom.map(
      p => `- Cost per bedroom, ${p.label}: ${usd(p.perBedroomCents)}/month per bedroom`,
    ),
    '',
    'Full breakdown, recomputed on every visit: https://wroomly.app/guides/ann-arbor-rent-prices',
  ].join('\n')

  const bySlug = new Map(s.byNeighborhood.map(b => [b.label, b]))
  const neighborhoods = [
    'Live median asking rent for each Ann Arbor neighborhood students rent in, from the same sample:',
    '',
    ...NEIGHBORHOOD_CONTENT.map(n => {
      const b = bySlug.get(n.name)
      const stat = b ? ` — median ${usd(b.medianCents)}/month (n=${b.count})` : ''
      return `- [${n.name}](https://wroomly.app/ann-arbor/${n.slug})${stat}`
    }),
  ].join('\n')

  const body = `# Wroomly

> Wroomly is a sublet and student-housing marketplace for the University of Michigan community in Ann Arbor. University of Michigan students verify through their @umich.edu Google login and carry a blue check next to their name, so renters can see which listings come from a real, verified U-M student. Anyone can browse, inquire, and list; the blue check is a visible trust signal, not a gate. Wroomly focuses on summer and term-time sublets near campus, with building-by-building landing pages, live rent-price data computed from active listings, and guides on subletting safely, avoiding scams, and Michigan deposit law.

## About

- Audience: University of Michigan students subletting or finding a place in Ann Arbor
- Coverage: Ann Arbor neighborhoods around Central, North, and Medical campuses
- Verification: UMich students verify via @umich.edu Google SSO and get a blue check (a trust signal, not a requirement to use the platform)
- Cost: listing a place is free; browsing is free

## Live data

${liveData}

## Safety and policies

- [Trust & Safety](https://wroomly.app/safety): What the blue check does and doesn't mean, community rules, the fair-housing policy, scam red flags with a do-this-instead checklist, and how reports are handled.
- [Terms of Service](https://wroomly.app/terms) · [Privacy Policy](https://wroomly.app/privacy)
- [Pricing](https://wroomly.app/pricing.md): Free to browse, list, and message; no fees of any kind today; no payments processed on-platform.

## Guides

- [How to sublet your apartment at the University of Michigan](https://wroomly.app/guides/how-to-sublet-your-apartment-at-university-of-michigan): Step-by-step on pricing, landlord approval, and finding a subletter as a U-M student.
- [Summer sublets in Ann Arbor: a student's guide](https://wroomly.app/guides/summer-sublets-in-ann-arbor-student-guide): How the Ann Arbor summer sublet market works, timing, and typical rents near campus.
- [How to avoid sublet scams in Ann Arbor](https://wroomly.app/guides/how-to-avoid-sublet-scams-ann-arbor): Red flags, safe payment practices, and how to verify a listing is real.
- [Security deposits for Ann Arbor sublets](https://wroomly.app/guides/security-deposits-ann-arbor-sublets): Michigan deposit law, the 30-day return rule, and documenting move-in/move-out.
- [The best Ann Arbor neighborhoods for UMich students](https://wroomly.app/guides/best-neighborhoods-for-umich-students): All eleven neighborhoods compared by walk time, vibe, and value.
- [The UMich off-campus housing timeline](https://wroomly.app/guides/umich-off-campus-housing-timeline): Ann Arbor's early leasing calendar month by month, and where sublets fit.
- [Sublet vs. relet vs. lease takeover](https://wroomly.app/guides/sublet-vs-relet-lease-takeover): Who stays on the lease, who holds the risk, and which arrangement fits.
- [Housing at UMich as an international student](https://wroomly.app/guides/international-student-housing-guide-umich): Renting from abroad safely — timing, documents, and sight-unseen precautions.
- [Grad student housing in Ann Arbor](https://wroomly.app/guides/grad-student-housing-ann-arbor): The quieter neighborhoods, medical-campus logistics, and sublet timing for grad life.
- [Winter semester sublets in Ann Arbor](https://wroomly.app/guides/winter-semester-sublets-ann-arbor): The January move-in market — who leaves mid-year and how to price a spring semester.
- [How to price your Ann Arbor sublet](https://wroomly.app/guides/how-to-price-your-sublet): Anchoring on live comparables and the empty-room math.
- [Your first Ann Arbor apartment: the move-in checklist](https://wroomly.app/guides/first-apartment-checklist-ann-arbor): Condition photos, utilities, renters insurance, and Ann Arbor-specific details.
- [How to verify an Ann Arbor landlord](https://wroomly.app/guides/how-to-verify-an-ann-arbor-landlord): Look up a rental's city Certificate of Compliance to confirm a listing is a real, licensed rental — a scam check almost no student uses.

## Buildings

Building-by-building sublet pages with verified addresses, floor plans, and amenities: [all buildings](https://wroomly.app/buildings)

- [Verve](https://wroomly.app/buildings/verve): 721 S Forest Ave — 12-story, 741-bed high-rise near Central Campus.
- [Hub on Campus](https://wroomly.app/buildings/hub-on-campus): 603 E Huron St — 15th-floor pool and rooftop deck.
- [Six11](https://wroomly.app/buildings/six11): 611 E University Ave — 343 beds, one block from the Diag.
- [Landmark](https://wroomly.app/buildings/landmark): 1300 S University Ave — 14 stories on the South U strip.
- [The Standard](https://wroomly.app/buildings/the-standard): 425 S Main St — downtown Main Street location.
- [Arbor Blu](https://wroomly.app/buildings/arbor-blu): 624 Church St — LEED Silver high-rise in the South U area.
- [Foundry Lofts](https://wroomly.app/buildings/foundry-lofts): 413 E Huron St — modern-industrial lofts, 204 units.
- [Vic Village North](https://wroomly.app/buildings/vic-village-north) and [Vic Village South](https://wroomly.app/buildings/vic-village-south): sister towers on S University Ave.
- [Z Place](https://wroomly.app/buildings/z-place): 619 E University Ave — furnished 2–6 bedroom apartments.
- [Saga](https://wroomly.app/buildings/saga): 411 E Washington St — formerly 411 Lofts / Sterling 4Eleven / YOUnion.
- [The Yard](https://wroomly.app/buildings/the-yard): 615 S Main St — near Michigan Stadium, campus shuttle.
- [Tower Plaza](https://wroomly.app/buildings/tower-plaza): 555 E William St — Ann Arbor's tallest building, 26 stories.
- [The Varsity](https://wroomly.app/buildings/the-varsity): 425 E Washington St — 13-story student high-rise.
- [Courtyards](https://wroomly.app/buildings/courtyards): 1780 Broadway St — 6-minute walk to North Campus.
- [Forest Plaza](https://wroomly.app/buildings/forest-plaza): 715 S Forest Ave — vintage 1929 building by Ross.
- [Ann Arbor City Apartments](https://wroomly.app/buildings/ann-arbor-city-apartments): W Washington & S First — downtown, grad-friendly.
- [The Legacy](https://wroomly.app/buildings/the-legacy): 616 E Washington St — 19-story high-rise by the Michigan Theatre.

## Key pages

- [Browse listings](https://wroomly.app/listings): Current sublets and rooms available near U-M.
- [All buildings](https://wroomly.app/buildings): Sublets by building, with addresses and amenities.
- [All guides](https://wroomly.app/guides): Every Wroomly guide plus a frequently-asked-questions section.
- [About Wroomly](https://wroomly.app/about): What Wroomly is and who it's for.
- [Sitemap](https://wroomly.app/sitemap.xml)

## Neighborhoods

${neighborhoods}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
