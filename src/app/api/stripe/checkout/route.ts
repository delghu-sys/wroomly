import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { stripe, calculateFees } from '@/lib/stripe'

const schema = z.object({
  listing_id: z.string().uuid(),
})

// POST /api/stripe/checkout — Airbnb-style: consumer pays Wroomly, we hold funds
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
  const { listing_id } = parsed.data

  // Verify consumer has an accepted inquiry
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
    .select('id, title, type, price_per_month, supplier_id, available_from')
    .eq('id', listing_id)
    .single()

  if (!listing || listing.type !== 'sublet') {
    return NextResponse.json({ error: 'Listing not available for payment' }, { status: 404 })
  }

  const amountCents = listing.price_per_month ?? 0
  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const { platformFee } = calculateFees(amountCents)
  const releaseDate = inquiry.move_in_date ?? listing.available_from

  try {
    // Get or create Stripe customer
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
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL!

    // Consumer pays Wroomly directly — no Connect transfer
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `${listing.title} — first month`,
              description: `Booking for ${listing.title}. Platform fee (${5}%) included.`,
            },
          },
        },
      ],
      metadata: {
        listing_id,
        payer_id: user.id,
        payee_id: listing.supplier_id,
        inquiry_id: inquiry.id,
        platform_fee_cents: String(platformFee),
        release_date: releaseDate ?? '',
      },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listings/${listing_id}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
