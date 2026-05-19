import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * PATCH /api/inquiries/[id]
 *
 * Funnel for supplier accept/decline. Re-verifies on the server that the
 * caller actually owns the listing the inquiry targets — previously the
 * client wrote directly via Supabase and trusted RLS to enforce that.
 *
 * On accept (sublet) we also post the `::deal_accepted::` system message
 * to the conversation so the consumer's `AcceptedSystemCard` can render.
 */

const schema = z.object({
  action: z.enum(['accept', 'decline']),
})

export async function PATCH(
  request: Request,
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

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Fetch inquiry + listing in one trip so we can authorize against the
  // listing's supplier_id without trusting client-supplied data.
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select(
      `
      id, status, consumer_id, listing_id,
      listings:listing_id (
        id, supplier_id, title, type, price_per_month, deposit_amount,
        users:supplier_id ( stripe_account_id )
      )
    `
    )
    .eq('id', inquiryId)
    .maybeSingle()

  if (!inquiry || !inquiry.listings) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  // Supabase may type `listings` as an array for FK joins; normalize.
  const rawListing = inquiry.listings as unknown
  const listing = (
    Array.isArray(rawListing) ? rawListing[0] : rawListing
  ) as {
    id: string
    supplier_id: string
    title: string | null
    type: string
    price_per_month: number | null
    deposit_amount: number | null
    users: unknown
  } | null

  if (!listing) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  if (listing.supplier_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (inquiry.status !== 'pending') {
    return NextResponse.json(
      { error: 'Inquiry is no longer pending.' },
      { status: 409 }
    )
  }

  // Sublet inquiries can't be accepted until the supplier has finished
  // Stripe Connect — otherwise there's nowhere for the rent to land.
  if (body.action === 'accept' && listing.type === 'sublet') {
    const rawSupplier = listing.users as unknown
    const supplierConnect = (
      Array.isArray(rawSupplier) ? rawSupplier[0] : rawSupplier
    ) as { stripe_account_id: string | null } | null
    if (!supplierConnect?.stripe_account_id) {
      return NextResponse.json(
        {
          error:
            'Connect your Stripe payout account before accepting sublet inquiries.',
        },
        { status: 422 }
      )
    }
  }

  // Service-role for the mutation — same pattern as admin actions.
  const service = await createServiceClient()
  const nextStatus = body.action === 'accept' ? 'accepted' : 'rejected'

  const { error: updateErr } = await service
    .from('inquiries')
    .update({ status: nextStatus })
    .eq('id', inquiryId)
    .eq('status', 'pending') // concurrency guard

  if (updateErr) {
    console.error('inquiry status update failed:', updateErr)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // On accept, post the `::deal_accepted::` system message so the
  // consumer sees the payment CTA in the chat thread.
  if (body.action === 'accept') {
    const { data: convo } = await service
      .from('conversations')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .maybeSingle()

    if (convo) {
      const payload = JSON.stringify({
        title: listing.title ?? '',
        type: listing.type ?? 'sublet',
        price: listing.price_per_month ?? 0,
        deposit: listing.deposit_amount ?? 0,
        listing_id: listing.id,
      })
      await service.from('messages').insert({
        conversation_id: convo.id,
        sender_id: user.id,
        content: `::deal_accepted::${payload}`,
      })
    }
  }

  return NextResponse.json({ ok: true, status: nextStatus })
}
