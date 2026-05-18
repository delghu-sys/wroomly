import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MessageSquare, Home } from 'lucide-react'
import { formatCents } from '@/lib/utils/listing'

export const metadata: Metadata = { title: 'Payment successful' }

/**
 * Read-only confirmation screen. All write-side state changes
 * (transaction insert, listing→rented, `::paid::` system message) live
 * in the Stripe webhook so they survive a closed tab and aren't subject
 * to the user's auth context. This page just reads what the webhook
 * already wrote.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/dashboard')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  let listingTitle: string | null = null
  let conversationId: string | null = null
  let amountPaid = 0

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)

    // Only show the confirmation to the person who actually paid — guards
    // against someone passing around a `?session_id=` to peek at a booking
    // that isn't theirs.
    if (session.metadata?.payer_id !== user.id) {
      redirect('/dashboard')
    }

    amountPaid = session.amount_total ?? 0

    const listingId = session.metadata?.listing_id
    const inquiryId = session.metadata?.inquiry_id

    // Listing title + conversation id are independent — fan out.
    const [listingRes, convoRes] = await Promise.all([
      listingId
        ? supabase.from('listings').select('title').eq('id', listingId).single()
        : Promise.resolve({ data: null as { title: string } | null }),
      inquiryId
        ? supabase
            .from('conversations')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .maybeSingle()
        : Promise.resolve({ data: null as { id: string } | null }),
    ])
    listingTitle = listingRes.data?.title ?? null
    conversationId = convoRes.data?.id ?? null
  } catch {
    // Stripe session retrieve failed — show generic success state.
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
          You&apos;re{' '}
          <span className="italic font-light text-[oklch(0.45_0.13_85)]">
            all set.
          </span>
        </h1>
        {listingTitle && (
          <p className="text-ink-muted mt-3 text-lg">
            Your booking for{' '}
            <strong className="text-ink">{listingTitle}</strong> is confirmed.
          </p>
        )}
        {amountPaid > 0 && (
          <p className="font-display text-2xl font-bold text-ink mt-2">
            {formatCents(amountPaid)} paid
          </p>
        )}
        <p className="text-sm text-ink-muted mt-2">
          A receipt has been emailed to you. The supplier has been notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          {conversationId && (
            <Link href={`/messages/${conversationId}`}>
              <Button className="press rounded-full bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.10_0.02_260)]/90 h-11 px-6 font-semibold">
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
