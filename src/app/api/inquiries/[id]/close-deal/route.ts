import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { inquiryDeclinedEmail } from '@/lib/email/templates'

/**
 * POST /api/inquiries/[id]/close-deal
 *
 * Supplier-only. Marks the listing behind this inquiry as 'rented' and
 * records the renter the deal closed with (`closed_with`) so they keep read
 * access after the listing leaves 'active' (RLS in migration 025; without it
 * they'd 404 on the place they just agreed to take, since payments are off
 * and there's no transaction row to fall back on).
 *
 * It also accepts the winning inquiry and auto-declines every other
 * still-pending inquiry on the same listing, emailing those renters so
 * nobody's left waiting on a place that's already gone.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: inquiryId } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch inquiry + listing together so we can authorize against the
  // listing's owner without trusting any client-supplied data.
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select(
      `
      id, consumer_id, listing_id,
      listings:listing_id ( id, supplier_id, title, type, status )
    `
    )
    .eq('id', inquiryId)
    .maybeSingle()

  if (!inquiry || !inquiry.listings) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  // Supabase types the FK join as a possible array; normalize.
  const rawListing = inquiry.listings as unknown
  const listing = (
    Array.isArray(rawListing) ? rawListing[0] : rawListing
  ) as {
    id: string
    supplier_id: string
    title: string | null
    type: string
    status: string
  } | null

  if (!listing) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  // Supplier decides — only the listing owner can close the deal.
  if (listing.supplier_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (listing.status !== 'active') {
    return NextResponse.json(
      { error: 'This listing is no longer open.' },
      { status: 409 }
    )
  }

  const service = createServiceClient()
  const closedStatus = 'rented'

  // 1. Close the listing + record the matched renter. Concurrency-guarded
  //    on status = 'active' so two quick taps can't double-close it.
  const { data: closed, error: closeErr } = await service
    .from('listings')
    .update({
      status: closedStatus,
      closed_with: inquiry.consumer_id,
      closed_at: new Date().toISOString(),
    })
    .eq('id', listing.id)
    .eq('status', 'active')
    .select('id')
    .maybeSingle()

  if (closeErr) {
    console.error('close-deal listing update failed:', closeErr)
    return NextResponse.json(
      { error: 'Could not close the deal.' },
      { status: 500 }
    )
  }
  if (!closed) {
    // Lost the race — someone (or another tab) already closed it.
    return NextResponse.json(
      { error: 'This listing is no longer open.' },
      { status: 409 }
    )
  }

  // 2. Mark the winning inquiry accepted (idempotent — it may already be).
  await service.from('inquiries').update({ status: 'accepted' }).eq('id', inquiryId)

  // 3. Auto-decline every other still-pending inquiry on this listing and
  //    notify those renters so they're not left hanging on a taken place.
  const { data: losers } = await service
    .from('inquiries')
    .select('consumer_id')
    .eq('listing_id', listing.id)
    .eq('status', 'pending')
    .neq('id', inquiryId)

  if (losers && losers.length > 0) {
    await service
      .from('inquiries')
      .update({ status: 'rejected' })
      .eq('listing_id', listing.id)
      .eq('status', 'pending')
      .neq('id', inquiryId)

    void notifyDeclined(
      losers.map(l => l.consumer_id),
      listing.title ?? 'Wroomly listing'
    )
  }

  // 4. Post the ::deal_closed:: system message in the winning conversation
  //    so both sides see the confirmation inline.
  const { data: convo } = await service
    .from('conversations')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .maybeSingle()

  if (convo) {
    const payload = JSON.stringify({
      title: listing.title ?? '',
      listing_id: listing.id,
    })
    await service.from('messages').insert({
      conversation_id: convo.id,
      sender_id: user.id,
      content: `::deal_closed::${payload}`,
    })
  }

  return NextResponse.json({ ok: true, status: closedStatus })
}

/**
 * Email the renters whose inquiries were auto-declined when the listing
 * was taken. Fire-and-forget — the status changes already committed; the
 * emails are a courtesy on top.
 */
async function notifyDeclined(consumerIds: string[], listingTitle: string) {
  try {
    const svc = createServiceClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
    const { data: users } = await svc
      .from('users')
      .select('email, full_name')
      .in('id', consumerIds)

    for (const u of users ?? []) {
      if (!u.email) continue
      const { subject, html } = inquiryDeclinedEmail({
        consumerName: u.full_name,
        listingTitle,
        browseUrl: `${appUrl}/listings`,
      })
      await sendEmail({ to: u.email, subject, html })
    }
  } catch (err) {
    console.error('[close-deal-decline-email] failed', err)
  }
}
