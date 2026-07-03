/**
 * Supply-only soft-launch gate helpers.
 *
 * When SUPPLY_ONLY_MODE is on, visitors who are NOT exempt (not an admin,
 * not a supplier, and without the preview-bypass cookie) are redirected to
 * /coming-soon for every renter-facing page. The paths below are the ones a
 * non-exempt visitor may still reach: the coming-soon page + waitlist API, the
 * auth flow, the public supplier entry points (so new suppliers can still sign
 * up and list), and legal pages.
 *
 * The whole gate is a no-op unless SUPPLY_ONLY_MODE === 'true', so this code is
 * inert in production until the env var is set.
 */

export const COMING_SOON_PATH = '/coming-soon'
export const BYPASS_COOKIE = 'wroomly_full_access'

const ALLOWED_EXACT = new Set<string>([
  '/coming-soon',
  // Auth — suppliers must be able to sign in / sign up / confirm.
  '/sign-in',
  '/sign-up',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  // Legal.
  '/terms',
  '/privacy',
  // Supplier "list your place" landing + chooser.
  '/list-place',
  '/start-listing',
  // Content-marketing surface — kept crawlable during supply-only so search /
  // AI engines keep indexing and citing our SEO content through the pre-launch
  // window. These pages don't expose the renter product (no inventory browsing
  // or booking), so showing them to everyone is safe. The actual product — the
  // home page, /listings, and Wroomly Match — stays gated.
  '/about',
  '/llms.txt',
])

const ALLOWED_PREFIXES = [
  '/callback', // OAuth + email-confirm code exchange
  '/import-listing', // public AI-import entry point for suppliers
  '/claim-listing/', // claim a drafted listing
  '/api/waitlist',
  '/api/events', // anonymous funnel events — coming-soon visitors count too
  '/monitoring', // Sentry browser tunnel — anonymous errors must report
  '/api/listing-imports', // supplier import APIs (do their own auth)
  '/sitemap',
  '/robots',
  '/manifest',
  // Content-marketing surface (see note in ALLOWED_EXACT). Guides, Ann Arbor
  // neighborhood pages, and building pages stay crawlable during supply-only.
  '/guides',
  '/ann-arbor',
  '/buildings',
]
// NOTE: Wroomly Match (/match, /api/match) is intentionally NOT listed here —
// the AI chat stays gated behind /coming-soon during SUPPLY_ONLY_MODE and only
// goes live for renters at full launch. Exempt users (admin/supplier/bypass)
// can still preview it.

/**
 * True if a NON-exempt visitor is still allowed to load this path while
 * supply-only mode is on. Everything else → /coming-soon.
 */
export function isSupplyOnlyAllowedPath(pathname: string): boolean {
  if (ALLOWED_EXACT.has(pathname)) return true
  return ALLOWED_PREFIXES.some(p => pathname.startsWith(p))
}
