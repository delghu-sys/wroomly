import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const listingId = session.metadata?.listing_id
      const inquiryId = session.metadata?.inquiry_id
      const payerId = session.metadata?.payer_id
      const payeeId = session.metadata?.payee_id
      const platformFeeCents = parseInt(session.metadata?.platform_fee_cents ?? '0', 10)
      const releaseDate = session.metadata?.release_date || null
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

      if (listingId && payerId && payeeId && paymentIntentId) {
        // Record transaction (idempotent)
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('transactions').insert({
            listing_id: listingId,
            payer_id: payerId,
            payee_id: payeeId,
            type: 'first_month',
            amount_cents: session.amount_total ?? 0,
            platform_fee_cents: platformFeeCents,
            stripe_payment_intent_id: paymentIntentId,
            status: 'succeeded',
            release_date: releaseDate,
          })
        } else {
          await supabase
            .from('transactions')
            .update({ status: 'succeeded' })
            .eq('stripe_payment_intent_id', paymentIntentId)
        }

        // Mark listing as rented
        await supabase.from('listings').update({ status: 'rented' }).eq('id', listingId)

        // Post ::paid:: system message in the conversation
        if (inquiryId) {
          const { data: convo } = await supabase
            .from('conversations')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .maybeSingle()
          if (convo) {
            await supabase.from('messages').insert({
              conversation_id: convo.id,
              sender_id: payerId,
              content: '::paid::{}',
            })
          }
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('transactions')
        .update({ status: 'succeeded' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      if (charge.payment_intent) {
        await supabase
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', charge.payment_intent as string)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
