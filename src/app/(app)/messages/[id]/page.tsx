import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/messages/ChatWindow'
import type { Message } from '@/types/database'

export const metadata: Metadata = { title: 'Chat' }

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: conversationData } = await supabase
    .from('conversations')
    .select(`
      *,
      listings(id, title, type, price_per_month, available_from, available_to),
      supplier:supplier_id(id, full_name, avatar_url),
      consumer:consumer_id(id, full_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (!conversationData) notFound()

  // Verify user is a participant
  const conv = conversationData as {
    id: string
    supplier_id: string
    consumer_id: string
    listing_id: string
    listings: { id: string; title: string; type: string; price_per_month: number | null } | null
    supplier: { id: string; full_name: string | null; avatar_url: string | null } | null
    consumer: { id: string; full_name: string | null; avatar_url: string | null } | null
  }

  if (conv.supplier_id !== user.id && conv.consumer_id !== user.id) {
    notFound()
  }

  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const messages = (messagesData ?? []) as Message[]

  // Mark messages as read
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  // Check whether consumer has successfully paid for this listing
  const { data: paidTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('listing_id', conv.listing_id)
    .eq('payer_id', conv.consumer_id)
    .eq('status', 'succeeded')
    .limit(1)
    .maybeSingle()

  const hasPaid = !!paidTx

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <ChatWindow
        conversation={conv}
        initialMessages={messages}
        currentUserId={user.id}
        hasPaid={hasPaid}
      />
    </div>
  )
}
