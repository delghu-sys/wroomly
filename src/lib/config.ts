/**
 * Launch-phase feature flags.
 *
 * PAYMENTS_ENABLED — master switch for all money movement. At launch
 * Wroomly is a pure matching platform: browse → inquire → accept →
 * connect + exchange contact info → arrange rent/deposit/lease directly,
 * off-platform. No Stripe checkout, no payouts, no fees.
 *
 * Flip to `true` (and re-enable the Stripe env + webhook) to turn the
 * full escrow payment flow back on. All the payment code is left intact
 * and gated on this flag, not deleted, so re-enabling is a one-line
 * change plus a redeploy.
 */
export const PAYMENTS_ENABLED = false

/**
 * SUPPLY_ONLY_MODE — soft-launch gate. When on, renter-facing browse pages
 * (home, /listings, listing detail, public profiles, and the /guides,
 * /ann-arbor, /buildings content pages) show the /coming-soon landing + renter
 * waitlist to anyone who isn't a logged-in supplier/admin. Supplier flows
 * (signup, import-listing, claim-listing, listing management, dashboard) stay
 * fully open. Toggle with the SUPPLY_ONLY_MODE env var; OFF by default.
 * Full launch = unset the env var (or set it to anything but 'true') + redeploy.
 */
export const SUPPLY_ONLY_MODE = process.env.SUPPLY_ONLY_MODE === 'true'
