import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { stripe, calculateFees } from '@/lib/stripe'

const schema = z.object({
  listing_id: z.string().uuid(),
  type: z.enum(['deposit', 'first_month']),
})

// POST /api/stripe/payment-intent
//
// Inline Stripe Elements equivalent of /api/stripe/checkout. Same Connect
// destination-charge pattern (consumer pays rent + 5% fee, Stripe routes
// rent to the supplier, Wroomly keeps the application fee).
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { listing_id, type } = parsed.data

  // The consumer must have an accepted inquiry on this listing — same gate
  // as /api/stripe/checkout. Without this, any signed-in user could create
  // a PaymentIntent against any listing.
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id, status, move_in_date')
    .eq('listing_id', listing_id)
    .eq('consumer_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!inquiry) {
    return NextResponse.json(
      { error: 'You need an accepted inquiry to pay.' },
      { status: 403 }
    )
  }

  // Prevent double payment. (UNIQUE index in migration 007 is the durable
  // guard; this is the fast-path 409.)
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

  // Supabase may return the FK relation as object or single-element array
  // depending on how typegen resolved the relationship. Tolerate both.
  const rawSupplier = listing.users as unknown
  const supplier = Array.isArray(rawSupplier)
    ? (rawSupplier[0] as { stripe_account_id: string | null } | undefined)
    : (rawSupplier as { stripe_account_id: string | null } | null)
  if (!supplier?.stripe_account_id) {
    return NextResponse.json(
      { error: 'Supplier has not connected their payout account yet.' },
      { status: 422 }
    )
  }

  // The supplier-facing amount (rent or deposit). The platform fee is added
  // on top — `totalChargeCents` is what we actually bill the consumer.
  const rentCents =
    type === 'deposit'
      ? (listing.deposit_amount ?? listing.price_per_month ?? 0)
      : (listing.price_per_month ?? 0)

  if (rentCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const { platformFee, totalChargeCents } = calculateFees(rentCents)

  // Get or create Stripe customer for the consumer.
  const { data: profile } = await supabase
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
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Release date — server-clamped. The supplier owns `available_from`
  // and the consumer owns `inquiry.move_in_date`; either could be
  // backdated, which would let "held" funds flip to "Payout available"
  // on the supplier dashboard immediately. Take the latest of the two
  // and never earlier than today.
  const candidates = [listing.available_from, inquiry.move_in_date]
    .filter(Boolean)
    .map(d => new Date(d as string))
  const todayMidnight = new Date()
  todayMidnight.setUTCHours(0, 0, 0, 0)
  const latest = candidates.reduce<Date>(
    (a, b) => (b.getTime() > a.getTime() ? b : a),
    todayMidnight
  )
  const clampedReleaseDate = latest.toISOString().slice(0, 10)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalChargeCents, // rent + 5% fee
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
      inquiry_id: inquiry.id,
      type,
      rent_cents: String(rentCents),
      platform_fee_cents: String(platformFee),
    },
  })

  // Create pending transaction record. `amount_cents` stores the total
  // charged (rent + fee); `platform_fee_cents` stores the fee. The payouts
  // page computes the supplier net as `amount - fee = rent`.
  await supabase.from('transactions').insert({
    listing_id,
    payer_id: user.id,
    payee_id: listing.supplier_id,
    type,
    amount_cents: totalChargeCents,
    platform_fee_cents: platformFee,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'pending',
    release_date: clampedReleaseDate,
  })

  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}
