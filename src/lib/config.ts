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
