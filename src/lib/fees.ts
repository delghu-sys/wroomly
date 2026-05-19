/**
 * Platform-fee constants. Kept in their own module — separate from
 * `@/lib/stripe` — so client components like FeeNote and BookingSidebar
 * can render the fee copy without pulling the Stripe Node SDK into the
 * browser bundle (the SDK constructor throws at module load when
 * STRIPE_SECRET_KEY is missing).
 */

export const PLATFORM_FEE_PERCENT = 5 // 5% platform fee, on rent only

// Stripe's per-transaction processing fee in the US for standard cards on
// Connect destination charges: 2.9% + $0.30. We pass this through to the
// consumer as a separate "Card processing" line item so Wroomly's 5% stays
// a true net margin instead of getting eaten by Stripe.
export const STRIPE_FEE_PERCENT = 2.9
export const STRIPE_FIXED_FEE_CENTS = 30

/**
 * Fee model — Wroomly's 5% is added on top of rent, and the Stripe
 * processing fee is then added on top of THAT and passed through as part
 * of the application_fee_amount, so:
 *
 *   - Supplier always receives exactly `rent + deposit`.
 *   - Wroomly always nets exactly its 5% on rent (after Stripe).
 *   - Consumer eats the Stripe surcharge.
 *
 * To make Wroomly net $W after Stripe takes $S = total × 2.9% + $0.30,
 * we solve:
 *
 *   total = supplierAmount + W + S
 *   total = supplierAmount + W + (total × 0.029 + 0.30)
 *   total × (1 − 0.029) = supplierAmount + W + 0.30
 *   total = (supplierAmount + W + 0.30) / 0.971
 *
 * Pure function with no Stripe dependency, safe to import anywhere.
 */
export function calculateFees(rentCents: number, depositCents: number = 0) {
  const wroomlyFeeCents = Math.round(rentCents * (PLATFORM_FEE_PERCENT / 100))
  const supplierAmountCents = rentCents + depositCents

  // Round up the total so we never under-collect by a cent due to fractions.
  const preStripeCents = supplierAmountCents + wroomlyFeeCents
  const totalChargeCents = Math.ceil(
    (preStripeCents + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_FEE_PERCENT / 100),
  )
  const stripeFeeCents = totalChargeCents - preStripeCents

  // What we pass as application_fee_amount in the destination charge —
  // the platform takes Wroomly's slice + the Stripe processing slice,
  // Stripe then subtracts its actual fee from the platform balance.
  const applicationFeeCents = wroomlyFeeCents + stripeFeeCents

  return {
    // Legacy alias — code that still expects `platformFee` keeps working
    // and just sees the bigger gross number including Stripe pass-through.
    platformFee: applicationFeeCents,

    // Specific components for UI display and audit.
    wroomlyFeeCents,        // Wroomly's true cut (the 5%)
    stripeFeeCents,         // Estimated Stripe processing fee passed through
    applicationFeeCents,    // What to pass to Stripe as application_fee_amount
    supplierAmountCents,    // rent + deposit, what reaches the supplier
    totalChargeCents,       // What the consumer actually pays
  }
}

/**
 * Coarse-grained payout-readiness state used across the UI to gate
 * supplier actions and render the right CTA. Lives here (not in
 * @/lib/stripe) so client components that only need the type don't drag
 * the Stripe SDK into their bundle.
 */
export type ConnectStatus = 'none' | 'incomplete' | 'active'
