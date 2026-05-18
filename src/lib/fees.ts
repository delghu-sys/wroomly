/**
 * Platform-fee constants. Kept in their own module — separate from
 * `@/lib/stripe` — so client components like FeeNote and BookingSidebar
 * can render the fee copy without pulling the Stripe Node SDK into the
 * browser bundle (the SDK constructor throws at module load when
 * STRIPE_SECRET_KEY is missing).
 */

export const PLATFORM_FEE_PERCENT = 5 // 5% platform fee, added on top of rent

/**
 * Fee model — the platform fee is **added on top** of the listed rent.
 * The supplier keeps the full rent they listed; the consumer pays the
 * surcharge.
 *
 *   rentCents        — what the supplier listed and receives.
 *   platformFee      — Wroomly's slice. Added on top of rent.
 *   totalChargeCents — what we actually charge the consumer.
 *
 * Example: rent $1,000 → consumer pays $1,050 → supplier nets $1,000,
 * Wroomly nets $50.
 *
 * Pure function with no Stripe dependency, safe to import anywhere.
 */
export function calculateFees(rentCents: number) {
  const platformFee = Math.round(rentCents * (PLATFORM_FEE_PERCENT / 100))
  const totalChargeCents = rentCents + platformFee
  const supplierAmount = rentCents
  return { platformFee, totalChargeCents, supplierAmount }
}

/**
 * Coarse-grained payout-readiness state used across the UI to gate
 * supplier actions and render the right CTA. Lives here (not in
 * @/lib/stripe) so client components that only need the type don't drag
 * the Stripe SDK into their bundle.
 */
export type ConnectStatus = 'none' | 'incomplete' | 'active'
