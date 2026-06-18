import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { partnerInquiryEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'

/**
 * POST /api/inquiries/partner
 *
 * Inquiries on PARTNER listings (e.g. A2 Management) don't open a Wroomly chat —
 * there's no real supplier account on the other side. Instead we forward the
 * student's message to the listing's `inquiry_email` with reply-to set to the
 * student, so the partner can respond directly. The forwarding address is read
 * server-side from the listing — never taken from the client — so this can't be
 * used to email arbitrary recipients.
 */
const bodySchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
  moveIn: z.string().max(40).optional().nullable(),
  moveOut: z.string().max(40).optional().nullable(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: listing } = await service
    .from('listings')
    .select('id, title, source, source_name, inquiry_email, status')
    .eq('id', body.listingId)
    .maybeSingle()

  if (!listing || listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }
  // Only partner listings forward by email; anything else is a client error.
  if (listing.source !== 'partner' || !listing.inquiry_email) {
    return NextResponse.json({ error: 'This listing does not accept forwarded inquiries.' }, { status: 400 })
  }

  // Inquirer identity comes from the authenticated profile, not the client.
  const { data: profile } = await service
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()
  const inquirerEmail = profile?.email ?? user.email ?? ''

  const { subject, html } = partnerInquiryEmail({
    partnerName: listing.source_name,
    listingTitle: listing.title,
    inquirerName: profile?.full_name ?? null,
    inquirerEmail,
    message: body.message,
    moveIn: body.moveIn ?? null,
    moveOut: body.moveOut ?? null,
  })

  const { ok } = await sendEmail({
    to: listing.inquiry_email,
    subject,
    html,
    replyTo: inquirerEmail || undefined,
  })

  if (!ok) {
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 502 })
  }

  console.info('[inquiries/partner] forwarded', { listingId: listing.id, userId: user.id })
  return NextResponse.json({ ok: true })
}
