import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

export const PLATFORM_FEE_PERCENT = 5 // 5% platform fee

export function calculateFees(amountCents: number) {
  const platformFee = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
  const supplierAmount = amountCents - platformFee
  return { platformFee, supplierAmount }
}
