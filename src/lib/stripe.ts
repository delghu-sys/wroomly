import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

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
 * The numeric relationships (used by the payouts page math today):
 *   totalChargeCents === amount_cents stored on the transaction
 *   platformFee      === platform_fee_cents stored on the transaction
 *   amount - fee     === supplier amount === rent (unchanged invariant)
 */
export function calculateFees(rentCents: number) {
  const platformFee = Math.round(rentCents * (PLATFORM_FEE_PERCENT / 100))
  const totalChargeCents = rentCents + platformFee
  const supplierAmount = rentCents
  return { platformFee, totalChargeCents, supplierAmount }
}
