import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Message, InquiryStatus } from '@/types/database'
import { MessagesShell } from '@/components/messages/MessagesShell'
import { ThreadView } from '@/components/messages/ThreadView'
import { loadConversations } from '@/components/messages/loadConversations'
import { fetchConnectStatus } from '@/lib/stripe'
import { getListingImageUrl } from '@/lib/utils/listing'

export const metadata: Metadata = { title: 'Chat' }

function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return getListingImageUrl(path)
}

interface ConvoRow {
  id: string
  supplier_id: string
  consumer_id: string
  listing_id: string
  inquiry_id: string | null
  listings: {
    id: string
    title: string
    type: string
    price_per_month: number | null
    available_from: string | null
    available_to: string | null
    neighborhood: string | null
    listing_images: { storage_path: string; display_order: number }[] | null
  } | null
  supplier: { id: string; full_name: string | null; avatar_url: string | null } | null
  consumer: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface InquiryRow {
  id: string
  message: string
  move_in_date: string | null
  move_out_date: string | null
  status: InquiryStatus
  consumer_id: string
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/messages/${id}`)

  // Fetch list + thread data in parallel
  const [conversationsPromise, threadDataPromise] = [
    loadConversations(user.id),
    supabase
      .from('conversations')
      .select(`
        *,
        listings(id, title, type, price_per_month, available_from, available_to, neighborhood, listing_images(storage_path, display_order)),
        supplier:supplier_id(id, full_name, avatar_url),
        consumer:consumer_id(id, full_name, avatar_url)
      `)
      .eq('id', id)
      .single(),
  ]

  const conversations = await conversationsPromise
  const { data: convoRaw } = await threadDataPromise
  if (!convoRaw) notFound()
  const conv = convoRaw as ConvoRow

  // Verify membership
  if (conv.supplier_id !== user.id && conv.consumer_id !== user.id) {
    notFound()
  }

  // Inquiry, messages, and paid status are independent — fan them out.
  const [inquiryRes, messagesRes, paidRes] = await Promise.all([
    conv.inquiry_id
      ? supabase
          .from('inquiries')
          .select('id, message, move_in_date, move_out_date, status, consumer_id')
          .eq('id', conv.inquiry_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', conv.listing_id)
      .eq('payer_id', conv.consumer_id)
      .eq('status', 'succeeded')
      .limit(1)
      .maybeSingle(),
  ])

  const inquiry = (inquiryRes.data as InquiryRow | null) ?? null
  const messages = (messagesRes.data ?? []) as Message[]
  const hasPaid = !!paidRes.data

  // Mark all unread messages from the other party as read. Awaited so
  // the row updates definitely commit (the old `void` + auth-bound
  // client was unreliable — Next.js Server Components don't guarantee
  // fire-and-forget queries execute, and RLS-bound writes can get
  // dropped silently). Service role bypasses RLS; the auth check on
  // user.id above already gates this route.
  await createServiceClient()
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  // Lookup supplier's Stripe Connect status so the inquiry accept gate
  // can decide whether the supplier can take the booking right now.
  const { data: supplierProfile } = await supabase
    .from('users')
    .select('stripe_account_id')
    .eq('id', conv.supplier_id)
    .single()
  const supplierConnect = await fetchConnectStatus(
    supplierProfile?.stripe_account_id ?? null
  )

  // Shape listing for ThreadView
  const firstImage = conv.listings?.listing_images
    ?.slice()
    .sort((a, b) => a.display_order - b.display_order)
    .at(0)

  const conversationForThread = {
    id: conv.id,
    listing_id: conv.listing_id,
    supplier_id: conv.supplier_id,
    consumer_id: conv.consumer_id,
    listings: conv.listings
      ? {
          id: conv.listings.id,
          title: conv.listings.title,
          type: conv.listings.type,
          price_per_month: conv.listings.price_per_month,
          available_from: conv.listings.available_from,
          available_to: conv.listings.available_to,
          neighborhood: conv.listings.neighborhood,
          thumbnailUrl: imageUrl(firstImage?.storage_path),
        }
      : null,
    supplier: conv.supplier,
    consumer: conv.consumer,
    inquiry: inquiry
      ? {
          id: inquiry.id,
          message: inquiry.message,
          move_in_date: inquiry.move_in_date,
          move_out_date: inquiry.move_out_date,
          status: inquiry.status,
          consumer_id: inquiry.consumer_id,
        }
      : null,
  }

  return (
    <MessagesShell
      conversations={conversations}
      activeId={id}
      mobileListHidden
      right={
        <ThreadView
          conversation={conversationForThread}
          initialMessages={messages}
          currentUserId={user.id}
          hasPaid={hasPaid}
          supplierPayoutReady={supplierConnect.status === 'active'}
        />
      }
    />
  )
}
