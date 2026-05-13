import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, CreditCard, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Message } from '@/types/database'

function previewLabel(content: string): string {
  if (content.startsWith('::payment_request::')) return '💳 Payment request'
  if (content.startsWith('::deal_accepted::')) return '✅ Inquiry accepted'
  if (content.startsWith('::paid::')) return '✅ Payment confirmed'
  return content
}

export const metadata: Metadata = { title: 'Messages' }

interface ConvoRow {
  id: string
  supplier_id: string
  consumer_id: string
  created_at: string
  listings: { id: string; title: string; type: string } | null
  supplier: { id: string; full_name: string | null; avatar_url: string | null } | null
  consumer: { id: string; full_name: string | null; avatar_url: string | null } | null
  messages: Message[]
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: conversationsData } = await supabase
    .from('conversations')
    .select(`
      *,
      listings(id, title, type),
      supplier:supplier_id(id, full_name, avatar_url),
      consumer:consumer_id(id, full_name, avatar_url),
      messages(id, content, created_at, sender_id, is_read)
    `)
    .or(`supplier_id.eq.${user.id},consumer_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const conversations = (conversationsData ?? []) as ConvoRow[]

  const sortedConvos = conversations.map(c => {
    const msgs = c.messages ?? []
    const lastMsg = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    const unread = msgs.filter(m => !m.is_read && m.sender_id !== user.id).length
    return { ...c, lastMsg, unread }
  }).sort((a, b) => {
    const aTime = a.lastMsg?.created_at ?? a.created_at
    const bTime = b.lastMsg?.created_at ?? b.created_at
    return bTime.localeCompare(aTime)
  })

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {sortedConvos.length} {sortedConvos.length === 1 ? 'conversation' : 'conversations'}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Your <span className="italic font-light text-navy">messages.</span>
        </h1>
      </div>

      {sortedConvos.length === 0 ? (
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">No conversations yet</p>
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
            Accepted inquiries open a chat here. Once you start one, it&apos;ll appear in this list.
          </p>
        </div>
      ) : (
        <div className="stagger-reveal space-y-2">
          {sortedConvos.map(convo => {
            const other = user.id === convo.supplier_id ? convo.consumer : convo.supplier
            const initials = other?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const lastContent = convo.lastMsg?.content ?? ''
            const isPayment = lastContent.startsWith('::payment_request::')
            const isAccepted = lastContent.startsWith('::deal_accepted::')

            return (
              <Link key={convo.id} href={`/messages/${convo.id}`} className="block">
                <div className="lift bg-surface border border-line rounded-3xl p-4 flex items-center gap-4 group">
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 ring-1 ring-line">
                      <AvatarImage src={other?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-soft text-navy text-sm font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {convo.unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-navy text-white text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-background animate-fade-in">
                        {convo.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${convo.unread > 0 ? 'font-semibold text-ink' : 'font-medium text-ink-soft'}`}>
                        {other?.full_name}
                      </p>
                      {convo.lastMsg && (
                        <p className="text-xs text-ink-muted shrink-0">
                          {format(parseISO(convo.lastMsg.created_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-navy/70 truncate mb-0.5 group-hover:text-navy ease-smooth transition-colors">
                      {convo.listings?.title}
                    </p>
                    {convo.lastMsg && (
                      <div className={`flex items-center gap-1.5 text-sm truncate ${convo.unread > 0 ? 'font-medium text-ink' : 'text-ink-muted'}`}>
                        {isPayment && <CreditCard className="w-3.5 h-3.5 shrink-0 text-navy" />}
                        {isAccepted && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[oklch(0.55_0.15_142)]" />}
                        <span className="truncate">
                          {convo.lastMsg.sender_id === user.id ? 'You: ' : ''}
                          {previewLabel(lastContent)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
