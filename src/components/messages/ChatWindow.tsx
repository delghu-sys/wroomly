'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, CreditCard, CheckCircle2, Sparkles, Check, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

const DEAL_ACCEPTED_PREFIX = '::deal_accepted::'
const PAYMENT_REQUEST_PREFIX = '::payment_request::' // legacy — render but don't create
const PAID_PREFIX = '::paid::'

interface ConversationData {
  id: string
  listing_id: string
  supplier_id: string
  consumer_id: string
  listings: { id: string; title: string; type: string; price_per_month: number | null } | null
  supplier: { id: string; full_name: string | null; avatar_url: string | null } | null
  consumer: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface ChatWindowProps {
  conversation: ConversationData
  initialMessages: Message[]
  currentUserId: string
  hasPaid: boolean
}

export function ChatWindow({ conversation, initialMessages, currentUserId, hasPaid }: ChatWindowProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [paying, setPaying] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const isConsumer = currentUserId === conversation.consumer_id
  const isSupplier = currentUserId === conversation.supplier_id

  const other = isSupplier ? conversation.consumer : conversation.supplier

  const otherInitials = other?.full_name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Refresh server components (navbar unread badge) after messages are marked as read server-side
  useEffect(() => {
    router.refresh()
  }, [router])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {
                router.refresh()
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, currentUserId, supabase, router])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content,
    })

    if (error) {
      setInput(content)
    }
    setSending(false)
  }

  async function startCheckout() {
    if (paying) return
    setPaying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: conversation.listing_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout')
        setPaying(false)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Could not start checkout')
      setPaying(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as React.FormEvent)
    }
  }

  const isSublet = conversation.listings?.type === 'sublet'
  const dealAcceptedMessage = messages.find(m => m.content.startsWith(DEAL_ACCEPTED_PREFIX))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-line shrink-0">
        <Link href="/messages" className="text-ink-muted hover:text-ink ease-smooth transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Avatar className="h-9 w-9 ring-1 ring-line">
          <AvatarImage src={other?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-navy-soft text-navy text-sm">{otherInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink text-sm">{other?.full_name}</p>
          {conversation.listings && (
            <Link
              href={`/listings/${conversation.listings.id}`}
              className="text-xs text-navy hover:underline truncate block"
            >
              {conversation.listings.title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-muted mt-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId
          const showDate = i === 0 || format(parseISO(messages[i - 1].created_at), 'yyyy-MM-dd') !== format(parseISO(msg.created_at), 'yyyy-MM-dd')

          // Deal accepted card — main payment entry point for consumer
          if (msg.content.startsWith(DEAL_ACCEPTED_PREFIX)) {
            const dataStr = msg.content.slice(DEAL_ACCEPTED_PREFIX.length)
            let data: { title?: string; type?: string; price?: number } = {}
            try { data = JSON.parse(dataStr) } catch {}
            const isThisSublet = data.type === 'sublet' || (data.type === undefined && isSublet)

            return (
              <div key={msg.id}>
                {showDate && (
                  <p className="text-center text-xs text-ink-muted my-4">
                    {format(parseISO(msg.created_at), 'MMMM d, yyyy')}
                  </p>
                )}
                <div className="flex justify-center my-2">
                  <div className="bg-[oklch(0.97_0.04_142)] border border-[oklch(0.85_0.1_142)] rounded-2xl p-5 max-w-sm w-full shadow-soft">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[oklch(0.93_0.08_142)] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[oklch(0.45_0.15_142)]" />
                      </div>
                      <p className="font-display font-semibold text-ink">Inquiry accepted</p>
                    </div>
                    <p className="text-sm text-ink-soft mb-1">
                      {conversation.supplier?.full_name} accepted your inquiry for:
                    </p>
                    <p className="font-display font-semibold text-ink">{data.title ?? conversation.listings?.title}</p>
                    {isThisSublet && data.price && data.price > 0 && (
                      <p className="text-lg font-display font-bold text-navy mt-1">
                        ${(data.price / 100).toLocaleString()}<span className="text-sm font-normal text-ink-muted">/mo</span>
                      </p>
                    )}

                    {isConsumer && isThisSublet && !hasPaid && (
                      <Button
                        onClick={startCheckout}
                        disabled={paying}
                        className="press w-full mt-4 rounded-full bg-navy text-white hover:bg-navy/90"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        {paying ? 'Redirecting…' : 'Pay first month'}
                      </Button>
                    )}

                    {hasPaid && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[oklch(0.45_0.15_142)] font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Paid · booking confirmed
                      </div>
                    )}

                    {isSupplier && isThisSublet && !hasPaid && (
                      <p className="text-xs text-ink-muted mt-3 text-center">
                        Waiting for {conversation.consumer?.full_name} to complete payment.
                      </p>
                    )}

                    <p className="text-xs text-ink-muted mt-3 text-center">
                      {format(parseISO(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          // Legacy payment-request card (read-only — no actions)
          if (msg.content.startsWith(PAYMENT_REQUEST_PREFIX)) {
            const dataStr = msg.content.slice(PAYMENT_REQUEST_PREFIX.length)
            let data: { title?: string; price?: number } = {}
            try { data = JSON.parse(dataStr) } catch {}
            return (
              <div key={msg.id}>
                {showDate && (
                  <p className="text-center text-xs text-ink-muted my-4">
                    {format(parseISO(msg.created_at), 'MMMM d, yyyy')}
                  </p>
                )}
                <div className="flex justify-center my-2">
                  <div className="bg-surface border border-line rounded-2xl p-4 max-w-sm w-full">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-navy" />
                      <p className="text-sm font-medium text-ink">Payment request · {data.title}</p>
                    </div>
                    {data.price ? (
                      <p className="text-sm text-ink-muted mt-1">${(data.price / 100).toLocaleString()}/mo</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          }

          // Paid receipt
          if (msg.content.startsWith(PAID_PREFIX)) {
            return (
              <div key={msg.id}>
                {showDate && (
                  <p className="text-center text-xs text-ink-muted my-4">
                    {format(parseISO(msg.created_at), 'MMMM d, yyyy')}
                  </p>
                )}
                <div className="flex justify-center my-2">
                  <div className="bg-[oklch(0.97_0.04_142)] border border-[oklch(0.85_0.1_142)] rounded-2xl px-5 py-3 max-w-sm w-full flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.45_0.15_142)] shrink-0" />
                    <p className="text-sm text-ink font-medium">Payment received · booking confirmed</p>
                  </div>
                </div>
              </div>
            )
          }

          // Normal message
          return (
            <div key={msg.id}>
              {showDate && (
                <p className="text-center text-xs text-ink-muted my-4">
                  {format(parseISO(msg.created_at), 'MMMM d, yyyy')}
                </p>
              )}
              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={other?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-navy-soft text-navy">{otherInitials}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-navy text-white rounded-br-sm'
                      : 'bg-surface text-ink border border-line rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isMe ? 'text-white/50 justify-end' : 'text-ink-muted'}`}>
                    {format(parseISO(msg.created_at), 'h:mm a')}
                    {isMe && (
                      msg.is_read
                        ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                        : <Check className="w-3.5 h-3.5" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Persistent Pay CTA for consumer if deal accepted but not paid */}
        {isConsumer && isSublet && dealAcceptedMessage && !hasPaid && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={startCheckout}
              disabled={paying}
              size="sm"
              className="press rounded-full bg-navy text-white hover:bg-navy/90"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              {paying ? 'Redirecting…' : 'Pay first month'}
            </Button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length < 4 && (
        <div className="flex gap-2 flex-wrap pt-2 shrink-0">
          {[
            'Is the rent negotiable?',
            'Are utilities included?',
            'Can I tour the apartment?',
            'Is the room furnished?',
            'How many roommates are there?',
            'Can I take over the lease?',
          ].map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-line bg-surface text-ink-soft hover:bg-navy-soft hover:text-navy hover:border-navy/20 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="pt-3 border-t border-line shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
