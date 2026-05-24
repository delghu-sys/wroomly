import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { inquiryReceivedEmail } from '@/lib/email/templates'

/**
 * POST /api/inquiries/[id]/notify-created
 *
 * Called fire-and-forget by InquiryModal after a successful insert.
 * Sends the supplier the "new inquiry" email.
 *
 * Auth: caller must be the consumer who created the inquiry. We don't
 * trust the client to send this on behalf of someone else — protects
 * against an attacker spamming arbitrary suppliers with fake emails.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: inquiryId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service-role read so we can join across listings + users tables
  // without each one needing its own RLS pass for the consumer.
  const service = createServiceClient()
  const { data: inquiry } = await service
    .from('inquiries')
    .select(
      `
      id, consumer_id, message, listing_id,
      listings:listing_id (
        id, title, supplier_id,
        users:supplier_id ( full_name, email )
      ),
      consumer:consumer_id ( full_name )
    `,
    )
    .eq('id', inquiryId)
    .maybeSingle()

  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Caller must be the consumer who made the inquiry. Stops a malicious
  // client from triggering arbitrary emails by replaying this endpoint.
  if (inquiry.consumer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Look up the conversation id so we can deep-link the supplier
  // straight into the chat thread.
  const { data: convo } = await service
    .from('conversations')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .maybeSingle()

  // Supabase FK joins can return object or single-element array depending
  // on the relationship resolution. Normalize.
  const listing = (
    Array.isArray(inquiry.listings) ? inquiry.listings[0] : inquiry.listings
  ) as {
    id: string
    title: string | null
    supplier_id: string
    users: unknown
  } | null
  const supplier = listing
    ? ((Array.isArray(listing.users) ? listing.users[0] : listing.users) as {
        full_name: string | null
        email: string | null
      } | null)
    : null
  const consumer = (
    Array.isArray(inquiry.consumer) ? inquiry.consumer[0] : inquiry.consumer
  ) as { full_name: string | null } | null

  if (!supplier?.email || !listing?.title) {
    // Nothing actionable — bail without erroring. The inquiry still
    // exists in the DB; the supplier will see it on /inquiries.
    return NextResponse.json({ ok: true, skipped: 'missing data' })
  }

  const conversationUrl = convo?.id
    ? `${APP_URL}/messages/${convo.id}`
    : `${APP_URL}/inquiries`

  const { subject, html } = inquiryReceivedEmail({
    supplierName: supplier.full_name,
    consumerName: consumer?.full_name ?? null,
    listingTitle: listing.title,
    inquiryMessage: inquiry.message ?? '',
    conversationUrl,
  })

  await sendEmail({ to: supplier.email, subject, html })

  // Always 200 — caller is fire-and-forget, and any send failure is
  // logged to Sentry from inside sendEmail. The inquiry itself was
  // already created successfully.
  return NextResponse.json({ ok: true })
}
