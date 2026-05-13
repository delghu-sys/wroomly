import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { stripe, calculateFees } from '@/lib/stripe'

const schema = z.object({
  listing_id: z.string().uuid(),
  type: z.enum(['deposit', 'first_month']),
})

// POST /api/stripe/payment-intent — create payment intent for consumer
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { listing_id, type } = parsed.data

  // Prevent double payment
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('payer_id', user.id)
    .in('status', ['succeeded', 'pending'])
    .maybeSingle()

  if (existingTx) {
    return NextResponse.json(
      { error: 'You have already paid for this listing.' },
      { status: 409 }
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('*, users:supplier_id(stripe_account_id)')
    .eq('id', listing_id)
    .eq('status', 'active')
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const supplier = listing.users as { stripe_account_id: string | null } | null
  if (!supplier?.stripe_account_id) {
    return NextResponse.json(
      { error: 'Supplier has not connected their payout account yet.' },
      { status: 422 }
    )
  }

  const amountCents =
    type === 'deposit'
      ? (listing.deposit_amount ?? listing.price_per_month ?? 0)
      : (listing.price_per_month ?? 0)

  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const { platformFee } = calculateFees(amountCents)

  // Get or create Stripe customer for consumer
  let { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: supplier.stripe_account_id,
    },
    metadata: {
      listing_id,
      payer_id: user.id,
      payee_id: listing.supplier_id,
      type,
    },
  })

  // Create pending transaction record
  await supabase.from('transactions').insert({
    listing_id,
    payer_id: user.id,
    payee_id: listing.supplier_id,
    type,
    amount_cents: amountCents,
    platform_fee_cents: platformFee,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'pending',
    release_date: listing.available_from,
  })

  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}
