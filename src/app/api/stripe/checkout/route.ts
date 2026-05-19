import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { stripe, calculateFees, PLATFORM_FEE_PERCENT } from '@/lib/stripe'

const schema = z.object({
  listing_id: z.string().uuid(),
})

// POST /api/stripe/checkout
//
// Stripe Connect destination charge via a hosted Checkout Session.
// The consumer pays (rent + 5% service fee). Stripe automatically routes
// the rent to the supplier's connected account and keeps the 5% as the
// platform's application fee. No "release funds" step — Stripe handles
// settlement timing on the Connect side.
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
  const { listing_id } = parsed.data

  // Verify the consumer has an accepted inquiry to pay against.
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

  // Prevent double payment.
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

  // Fetch listing + supplier's Connect account in one round-trip.
  const { data: listing } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      type,
      price_per_month,
      deposit_amount,
      supplier_id,
      available_from,
      users:supplier_id(stripe_account_id)
    `)
    .eq('id', listing_id)
    .single()

  if (!listing || listing.type !== 'sublet') {
    return NextResponse.json(
      { error: 'Listing not available for payment' },
      { status: 404 }
    )
  }

  const rentCents = listing.price_per_month ?? 0
  // Deposit is optional — a supplier can skip it. Coerce nullish/negative
  // values to 0 so a missing field can't break checkout.
  const depositCents = Math.max(0, listing.deposit_amount ?? 0)
  if (rentCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Supplier must have completed Stripe Connect onboarding before we can
  // route funds to them. The Supabase relation type can come back as
  // either an object or a single-element array depending on how the FK
  // resolves, so we tolerate both shapes.
  const rawSupplier = listing.users as unknown
  const supplier = Array.isArray(rawSupplier)
    ? (rawSupplier[0] as { stripe_account_id: string | null } | undefined)
    : (rawSupplier as { stripe_account_id: string | null } | null)
  if (!supplier?.stripe_account_id) {
    return NextResponse.json(
      {
        error:
          "The host hasn't connected their payout account yet. Ask them to finish payout setup on Wroomly.",
      },
      { status: 422 }
    )
  }

  // Platform fee charged on rent only — deposit is "held" money, not
  // consumed, and Wroomly shouldn't double-dip when it's returned. The
  // deposit flows straight through to the supplier alongside rent.
  const { platformFee } = calculateFees(rentCents)
  const totalSupplierAmount = rentCents + depositCents // what lands on supplier's connected account
  const releaseDate = inquiry.move_in_date ?? listing.available_from

  try {
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

    const origin = process.env.NEXT_PUBLIC_APP_URL!

    // Line items shown in Stripe's hosted Checkout. We show rent, deposit
    // (if any), and the service fee as separate rows so the consumer sees
    // exactly where their money goes. The fee is charged on rent only —
    // the deposit is held money, not consumed.
    const lineItems: Stripe.Checkout.SessionCreateParams['line_items'] = [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: rentCents,
          product_data: {
            name: `${listing.title} — first month`,
            description: 'Rent paid to your host.',
          },
        },
      },
    ]

    if (depositCents > 0) {
      lineItems!.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: depositCents,
          product_data: {
            name: 'Security deposit',
            description:
              'Held by your host. Returned at the end of the lease (less any damages, by agreement).',
          },
        },
      })
    }

    lineItems!.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: platformFee,
        product_data: {
          name: `Wroomly service fee (${PLATFORM_FEE_PERCENT}%)`,
          description: 'Covers verification, escrowed payments, and in-app messaging.',
        },
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: lineItems,
      // Stripe Connect — destination charge.
      // `application_fee_amount` is the slice Stripe routes back to the
      // platform account; the remainder (rent + deposit) lands on the
      // supplier's connected account. We deliberately do NOT charge the
      // platform fee on the deposit portion.
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: supplier.stripe_account_id,
        },
        metadata: {
          listing_id,
          payer_id: user.id,
          payee_id: listing.supplier_id,
          inquiry_id: inquiry.id,
          rent_cents: String(rentCents),
          deposit_cents: String(depositCents),
          platform_fee_cents: String(platformFee),
          supplier_total_cents: String(totalSupplierAmount),
        },
      },
      metadata: {
        listing_id,
        payer_id: user.id,
        payee_id: listing.supplier_id,
        inquiry_id: inquiry.id,
        rent_cents: String(rentCents),
        deposit_cents: String(depositCents),
        platform_fee_cents: String(platformFee),
        release_date: releaseDate ?? '',
      },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listings/${listing_id}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
