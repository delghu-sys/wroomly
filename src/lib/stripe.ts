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

/**
 * Coarse-grained payout-readiness state used across the UI to gate
 * supplier actions and render the right CTA.
 *
 *   none       — no Connect account exists yet (user never started).
 *   incomplete — account exists, Stripe still wants more info.
 *   active     — charges + payouts both enabled. Ready to receive money.
 */
export type ConnectStatus = 'none' | 'incomplete' | 'active'

/**
 * Look up a supplier's Connect account state. Pass null/undefined to
 * handle the "no account on file yet" case in one place. Returns a small
 * struct so callers don't have to think about Stripe SDK shapes.
 */
export async function fetchConnectStatus(
  stripeAccountId: string | null | undefined
): Promise<{
  status: ConnectStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}> {
  if (!stripeAccountId) {
    return {
      status: 'none',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    }
  }
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId)
    const chargesEnabled = !!account.charges_enabled
    const payoutsEnabled = !!account.payouts_enabled
    const detailsSubmitted = !!account.details_submitted
    const status: ConnectStatus =
      chargesEnabled && payoutsEnabled ? 'active' : 'incomplete'
    return { status, chargesEnabled, payoutsEnabled, detailsSubmitted }
  } catch (err) {
    // If Stripe rejects the retrieve (account deleted, key mismatch,
    // etc.) treat it as "needs to start over" so the supplier can
    // re-enter onboarding instead of being stuck.
    console.error('Failed to fetch Connect account', stripeAccountId, err)
    return {
      status: 'none',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    }
  }
}
