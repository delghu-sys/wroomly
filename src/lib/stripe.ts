import Stripe from 'stripe'

// Lazy-init via Proxy: the Stripe SDK constructor throws "Neither apiKey
// nor config.authenticator provided" the moment it's instantiated without
// a key. Constructing at module scope means every code path that pulls
// this file into a build chunk — including client bundles that imported
// `calculateFees` or the ConnectStatus type — crashes at page load if
// STRIPE_SECRET_KEY is missing in the deployed env.
//
// The Proxy here keeps the existing `import { stripe } from '@/lib/stripe'`
// usage working: callers see the same object, but the real Stripe client
// is only constructed the first time someone *accesses a property* on it
// (e.g. `stripe.accounts.create(...)`). At that point we're inside a
// server function that needs the key anyway, so a missing-key error is
// the right time to throw.
let _client: Stripe | null = null
function getStripe(): Stripe {
  if (_client) return _client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set — Stripe operations unavailable')
  }
  _client = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return _client
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe(), prop)
  },
})

// Fee constants + ConnectStatus type live in @/lib/fees so client
// components can import them without dragging the Stripe SDK into the
// browser bundle. Re-export from here for backward compat — existing
// server-side callers can keep importing from '@/lib/stripe'.
import type { ConnectStatus } from './fees'
export { PLATFORM_FEE_PERCENT, calculateFees, type ConnectStatus } from './fees'

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
