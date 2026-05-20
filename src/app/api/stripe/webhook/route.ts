import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, calculateFees } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

/**
 * POST /api/stripe/webhook
 *
 * Stripe → Wroomly event sink. Verifies signature, dedupes via the
 * `webhook_events` table (added in migration 007), then dispatches.
 *
 * Source of truth for all post-payment state mutations: the consumer's
 * /payment/success page is read-only. Anything that writes lives here.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

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

  // Idempotency. Stripe will retry, sometimes weeks later. We insert the
  // event id first; if it's already there, this delivery is a replay and
  // we exit without re-applying state changes.
  const { error: dedupeErr } = await supabase
    .from('webhook_events')
    .insert({ id: event.id, type: event.type })

  if (dedupeErr) {
    // 23505 = unique_violation in Postgres → replay, safe to drop.
    if ('code' in dedupeErr && dedupeErr.code === '23505') {
      return NextResponse.json({ received: true, replay: true })
    }
    // Any other error: log and still attempt processing so we don't lose
    // critical events because the dedupe table is unreachable.
    console.error('webhook dedupe insert failed:', dedupeErr)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session
        )
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          supabase,
          event.data.object as Stripe.PaymentIntent
        )
        break

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await transitionTxStatus(
          supabase,
          (event.data.object as Stripe.PaymentIntent).id,
          event.type === 'payment_intent.canceled' ? 'failed' : 'failed'
        )
        break

      case 'charge.refunded':
      case 'charge.refund.updated':
        await handleRefund(supabase, event.data.object as Stripe.Charge)
        break

      case 'charge.dispute.created':
      case 'charge.dispute.closed':
        await handleDispute(supabase, event.data.object as Stripe.Dispute)
        break

      case 'account.updated':
        await handleAccountUpdated(
          supabase,
          event.data.object as Stripe.Account
        )
        break
    }
  } catch (err) {
    console.error('webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Handlers ──────────────────────────────────────────────────────────

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session
) {
  const listingId = session.metadata?.listing_id
  const inquiryId = session.metadata?.inquiry_id
  const payerId = session.metadata?.payer_id
  const payeeId = session.metadata?.payee_id
  const metaReleaseDate = session.metadata?.release_date || null

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id

  if (!listingId || !payerId || !payeeId || !paymentIntentId) {
    console.error('checkout.session.completed missing metadata')
    return
  }

  // Trust the DB, not the metadata. Recompute fee + deposit from the
  // listing so a bug or future caller can't poison the transaction row.
  const { data: listing } = await supabase
    .from('listings')
    .select('id, supplier_id, price_per_month, deposit_amount')
    .eq('id', listingId)
    .single()

  if (!listing || listing.supplier_id !== payeeId) {
    console.error('checkout webhook listing/payee mismatch', {
      listingId,
      payeeId,
    })
    return
  }

  const rentCents = listing.price_per_month ?? 0
  const depositCents = Math.max(0, listing.deposit_amount ?? 0)
  // Recompute the full fee breakdown from the DB-trusted rent + deposit.
  // `applicationFeeCents` is what Stripe took as the application fee
  // (Wroomly's 5% + Stripe processing pass-through). `totalChargeCents`
  // is the gross we expected to charge the consumer; trust Stripe's
  // `amount_total` first since occasional drift is possible.
  const {
    applicationFeeCents,
    totalChargeCents: expectedTotal,
  } = calculateFees(rentCents, depositCents)
  const amountTotal = session.amount_total ?? expectedTotal

  // Clamp release_date — same logic as the payment-intent route.
  const releaseDate = clampReleaseDate(metaReleaseDate)

  // ── Idempotency check (webhook retry safety) ───────────────────────
  // Stripe retries webhooks with exponential backoff on non-2xx responses.
  // The transactions table has UNIQUE(stripe_payment_intent_id) from 007,
  // so re-running the upsert below is safe — but we also need to skip the
  // listing-status flip and system message on retries so we don't auto-
  // decline the same losing inquiries twice.
  const { data: existingTxForThisPi } = await supabase
    .from('transactions')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  const isRetry = !!existingTxForThisPi

  // ── Atomic race claim ──────────────────────────────────────────────
  // Try to flip the listing from `active` → `rented`. The WHERE clause
  // makes this a single Postgres operation, so when two webhooks fire
  // simultaneously only one update succeeds. The loser refunds itself
  // and bails out below.
  let wonRace = isRetry // a retry inherits the original win
  if (!isRetry) {
    const { data: updatedListings } = await supabase
      .from('listings')
      .update({ status: 'rented' })
      .eq('id', listingId)
      .eq('status', 'active')
      .select('id')
    wonRace = !!updatedListings && updatedListings.length > 0
  }

  if (!wonRace) {
    // We lost the race — another consumer's payment landed first and
    // already marked the listing rented. Refund this payment so the
    // consumer isn't charged for a place they didn't get. We do NOT
    // insert a transaction row; the refund will fire a separate webhook
    // that handles the bookkeeping.
    console.warn('[webhook] lost booking race, refunding duplicate payment', {
      paymentIntentId,
      listingId,
      payerId,
    })
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          reason: 'listing_already_rented',
          listing_id: listingId,
          payer_id: payerId,
        },
      })
    } catch (err) {
      console.error('[webhook] failed to refund losing payment', err)
    }

    // Tell the losing consumer in their chat thread, so they don't sit
    // around wondering what happened.
    if (inquiryId) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id')
        .eq('inquiry_id', inquiryId)
        .maybeSingle()
      if (convo) {
        await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: payeeId, // posted "from" the supplier
          content: '::booked_by_other::',
        })
      }
      // Mark the inquiry rejected so the listing detail page no longer
      // shows the "pay now" CTA to this consumer.
      await supabase
        .from('inquiries')
        .update({ status: 'rejected' })
        .eq('id', inquiryId)
    }
    return
  }

  // ── Won the race — record the transaction ──────────────────────────
  // INSERT … ON CONFLICT DO UPDATE so concurrent webhook + success-page
  // retries don't crash on the UNIQUE constraint added in migration 007.
  await supabase
    .from('transactions')
    .upsert(
      {
        listing_id: listingId,
        payer_id: payerId,
        payee_id: payeeId,
        type: 'first_month',
        amount_cents: amountTotal,
        // platform_fee_cents stores the gross application fee — what
        // Wroomly collected before Stripe subtracted its actual fee.
        // Supplier net = amount_cents - platform_fee_cents = rent + deposit.
        platform_fee_cents: applicationFeeCents,
        deposit_cents: depositCents,
        stripe_payment_intent_id: paymentIntentId,
        status: 'succeeded',
        release_date: releaseDate,
      },
      { onConflict: 'stripe_payment_intent_id' }
    )

  // Auto-decline OTHER accepted-but-unpaid inquiries on the same listing.
  // Suppliers can accept multiple consumers; first-to-pay wins, the
  // others get a system message explaining and their inquiry closes.
  // Skip on retries to avoid double-posting messages.
  if (!isRetry) {
    const { data: losingInquiries } = await supabase
      .from('inquiries')
      .select('id, consumer_id')
      .eq('listing_id', listingId)
      .eq('status', 'accepted')
      .neq('consumer_id', payerId)

    if (losingInquiries && losingInquiries.length > 0) {
      const losingIds = losingInquiries.map(i => i.id)
      await supabase
        .from('inquiries')
        .update({ status: 'rejected' })
        .in('id', losingIds)

      // Post a system message in each losing conversation.
      for (const inq of losingInquiries) {
        const { data: convo } = await supabase
          .from('conversations')
          .select('id')
          .eq('inquiry_id', inq.id)
          .maybeSingle()
        if (convo) {
          await supabase.from('messages').insert({
            conversation_id: convo.id,
            sender_id: payeeId, // from the supplier
            content: '::booked_by_other::',
          })
        }
      }
    }
  }

  if (inquiryId) {
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .maybeSingle()
    if (convo) {
      // Already-posted ::paid:: is idempotent thanks to our LIKE check.
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', convo.id)
        .like('content', '::paid::%')
        .maybeSingle()
      if (!existing) {
        await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: payerId,
          content: '::paid::{}',
        })
      }
    }
  }
}

async function handlePaymentIntentSucceeded(
  supabase: ServiceClient,
  pi: Stripe.PaymentIntent
) {
  // Only transition pending → succeeded. Anything already in a terminal
  // state (refunded, failed) is left alone.
  const { data: tx } = await supabase
    .from('transactions')
    .select('status')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()

  if (!tx || tx.status !== 'pending') return

  await supabase
    .from('transactions')
    .update({ status: 'succeeded' })
    .eq('stripe_payment_intent_id', pi.id)
}

async function transitionTxStatus(
  supabase: ServiceClient,
  paymentIntentId: string,
  next: 'failed' | 'refunded'
) {
  // Don't clobber a `succeeded` row that has already happened to be
  // refunded — only set `failed` while pending, only set `refunded` while
  // succeeded.
  const allowed =
    next === 'refunded' ? ['succeeded'] : ['pending']

  await supabase
    .from('transactions')
    .update({ status: next })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .in('status', allowed)
}

async function handleRefund(supabase: ServiceClient, charge: Stripe.Charge) {
  if (!charge.payment_intent) return
  const pi =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent.id

  // Always mirror Stripe's authoritative refunded-amount on the row.
  // Stripe ships `amount_refunded` as the running total, so re-applying
  // the same event is safe (idempotent set, not an increment).
  const { error: refundedErr } = await supabase
    .from('transactions')
    .update({ refunded_cents: charge.amount_refunded })
    .eq('stripe_payment_intent_id', pi)
  if (refundedErr) {
    console.error('[handleRefund] failed to write refunded_cents', refundedErr)
  }

  // Full refund additionally flips status.
  const isFullRefund = charge.amount_refunded === charge.amount
  if (isFullRefund) {
    await transitionTxStatus(supabase, pi, 'refunded')
  }
}

async function handleDispute(
  supabase: ServiceClient,
  dispute: Stripe.Dispute
) {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id
  if (!paymentIntentId) return

  // Future: write to a dedicated `disputes` table + notify the admin.
  // For now we just log so a chargeback doesn't silently vanish.
  console.warn('Stripe dispute event:', {
    id: dispute.id,
    status: dispute.status,
    reason: dispute.reason,
    payment_intent: paymentIntentId,
  })
}

async function handleAccountUpdated(
  supabase: ServiceClient,
  account: Stripe.Account
) {
  // Mirror the supplier's Stripe readiness onto the users table so feature
  // gates (inquiry accept, listing publish) don't need a Stripe RTT.
  const userId = account.metadata?.user_id
  if (!userId) {
    // Fall back to stripe_account_id lookup — older Connect accounts may
    // pre-date the metadata convention.
    const { error } = await supabase
      .from('users')
      .update({
        stripe_charges_enabled: !!account.charges_enabled,
        stripe_payouts_enabled: !!account.payouts_enabled,
        stripe_details_submitted: !!account.details_submitted,
      })
      .eq('stripe_account_id', account.id)
    if (error) console.error('[account.updated] update by acct id failed', error)
    return
  }

  const { error } = await supabase
    .from('users')
    .update({
      stripe_charges_enabled: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_details_submitted: !!account.details_submitted,
    })
    .eq('id', userId)
  if (error) console.error('[account.updated] update by user id failed', error)
}

// Server-clamped release date — same logic as the payment-intent route.
function clampReleaseDate(meta: string | null): string {
  const todayMidnight = new Date()
  todayMidnight.setUTCHours(0, 0, 0, 0)

  if (!meta) return todayMidnight.toISOString().slice(0, 10)

  const parsed = new Date(meta)
  if (Number.isNaN(parsed.getTime())) {
    return todayMidnight.toISOString().slice(0, 10)
  }
  const later = parsed.getTime() > todayMidnight.getTime() ? parsed : todayMidnight
  return later.toISOString().slice(0, 10)
}
