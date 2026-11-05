import { ANN_ARBOR_RESIDENCES } from '../residences.ts'

/**
 * Which /guides, /ann-arbor and /buildings slugs exist.
 *
 * Why this exists: every page here renders on demand behind a loading
 * boundary, so by the time a page notices its slug is unknown the response
 * has already been sent as HTTP 200. Search engines then report "soft 404"s
 * and spend crawl on pages that do not exist. The middleware uses this list to
 * answer a real 404 up front. It is deliberately small (no page content) so it
 * costs the middleware nothing.
 *
 * The guide and neighborhood lists are written out; a unit test fails if they
 * drift from the real data, so adding a guide without adding it here cannot
 * ship. Building slugs are derived from the same list the pages use.
 */

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const GUIDE_SLUGS: readonly string[] = [
  'how-to-sublet-your-apartment-at-university-of-michigan',
  'summer-sublets-in-ann-arbor-student-guide',
  'how-to-avoid-sublet-scams-ann-arbor',
  'security-deposits-ann-arbor-sublets',
  'best-neighborhoods-for-umich-students',
  'umich-off-campus-housing-timeline',
  'sublet-vs-relet-lease-takeover',
  'international-student-housing-guide-umich',
  'grad-student-housing-ann-arbor',
  'winter-semester-sublets-ann-arbor',
  'how-to-price-your-sublet',
  'first-apartment-checklist-ann-arbor',
  'how-to-verify-an-ann-arbor-landlord',
  'where-to-find-a-sublet-umich',
  'how-to-pay-for-a-sublet-safely',
  'find-a-roommate-umich-off-campus',
  'individual-lease-vs-joint-lease-ann-arbor',
  'roommate-agreement-checklist-off-campus',
  'split-rent-with-roommates-different-bedrooms',
  'sublet-apartment-while-studying-abroad',
  'do-you-need-a-car-umich-off-campus',
  'off-campus-housing-near-north-campus-umich',
  'sublet-your-room-with-roommates-staying',
  'cost-of-living-ann-arbor-student',
  'fall-semester-sublet-ann-arbor',
]

/** The live rent data page is its own route, not part of the GUIDES data. */
export const GUIDE_ROUTE_SLUGS: readonly string[] = [...GUIDE_SLUGS, 'ann-arbor-rent-prices']

export const NEIGHBORHOOD_SLUGS: readonly string[] = [
  'central-campus',
  'north-campus',
  'south-university',
  'kerrytown',
  'old-west-side',
  'burns-park',
  'water-hill',
  'eberwhite',
  'pittsfield',
  'downtown',
  'lower-town',
]

export const BUILDING_SLUGS: readonly string[] = ANN_ARBOR_RESIDENCES.map(slugifyName)

const SETS: Record<string, ReadonlySet<string>> = {
  guides: new Set(GUIDE_ROUTE_SLUGS),
  'ann-arbor': new Set(NEIGHBORHOOD_SLUGS),
  buildings: new Set(BUILDING_SLUGS),
}

/** True for /guides/<x>, /ann-arbor/<x> or /buildings/<x> where <x> is not a real page.
 *  Any other path is never "unknown" here. */
export function isUnknownSeoPage(pathname: string): boolean {
  const m = pathname.match(/^\/(guides|ann-arbor|buildings)\/([^/]+)$/)
  if (!m) return false
  let slug = m[2]
  try {
    slug = decodeURIComponent(slug)
  } catch {
    return true
  }
  return !SETS[m[1]].has(slug)
}
