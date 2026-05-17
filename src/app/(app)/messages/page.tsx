import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MessagesShell } from '@/components/messages/MessagesShell'
import { EmptyThreadState } from '@/components/messages/EmptyThreadState'
import { loadConversations } from '@/components/messages/loadConversations'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/messages')

  const conversations = await loadConversations(user.id)

  return (
    <MessagesShell
      conversations={conversations}
      right={<EmptyThreadState hasConversations={conversations.length > 0} />}
    />
  )
}
