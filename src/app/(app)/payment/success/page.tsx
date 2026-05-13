import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { stripe, calculateFees } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MessageSquare, Home } from 'lucide-react'
import { formatCents } from '@/lib/utils/listing'

export const metadata: Metadata = { title: 'Payment successful' }

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  let listingTitle: string | null = null
  let conversationId: string | null = null
  let amountPaid = 0

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    const listingId = session.metadata?.listing_id
    const inquiryId = session.metadata?.inquiry_id
    const payerId = session.metadata?.payer_id
    const payeeId = session.metadata?.payee_id
    const platformFeeCents = parseInt(session.metadata?.platform_fee_cents ?? '0', 10)
    const releaseDate = session.metadata?.release_date || null
    amountPaid = session.amount_total ?? 0

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as { id: string } | null)?.id ?? null

    if (listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('title')
        .eq('id', listingId)
        .single()
      listingTitle = listing?.title ?? null
    }

    if (inquiryId) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id')
        .eq('inquiry_id', inquiryId)
        .maybeSingle()
      conversationId = convo?.id ?? null
    }

    // Record transaction if not already recorded (idempotent — webhook may have done it already)
    if (listingId && payerId && payeeId && paymentIntentId && session.payment_status === 'paid') {
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (!existingTx) {
        const fees = platformFeeCents || calculateFees(amountPaid).platformFee
        await supabase.from('transactions').insert({
          listing_id: listingId,
          payer_id: payerId,
          payee_id: payeeId,
          type: 'first_month',
          amount_cents: amountPaid,
          platform_fee_cents: fees,
          stripe_payment_intent_id: paymentIntentId,
          status: 'succeeded',
          release_date: releaseDate,
        })
      }

      // Mark listing as rented
      await supabase.from('listings').update({ status: 'rented' }).eq('id', listingId)

      // Post ::paid:: system message in conversation (idempotent check)
      if (conversationId) {
        const { data: existingPaidMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .like('content', '::paid::%')
          .maybeSingle()

        if (!existingPaidMsg) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: payerId,
            content: '::paid::{}',
          })
        }
      }
    }
  } catch {
    // Stripe session retrieval failed — show generic success
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="animate-fade-up text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-[oklch(0.96_0.04_142)] text-[oklch(0.55_0.15_142)] items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          Payment confirmed
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          You&apos;re <span className="italic font-light text-navy">all set.</span>
        </h1>
        {listingTitle && (
          <p className="text-ink-muted mt-3 text-lg">
            Your booking for <strong className="text-ink">{listingTitle}</strong> is confirmed.
          </p>
        )}
        {amountPaid > 0 && (
          <p className="font-display text-2xl font-bold text-navy mt-2">
            {formatCents(amountPaid)} paid
          </p>
        )}
        <p className="text-sm text-ink-muted mt-2">
          A receipt has been emailed to you. The supplier has been notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          {conversationId && (
            <Link href={`/messages/${conversationId}`}>
              <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message your host
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-full h-11 px-6">
              <Home className="w-4 h-4 mr-2" />
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
