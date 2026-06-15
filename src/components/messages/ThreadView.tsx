'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import type { Message, InquiryStatus } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { MessageAtmosphere } from './MessageAtmosphere'
import { ThreadHeader } from './ThreadHeader'
import { MessageBubble } from './MessageBubble'
import { DateSeparator } from './DateSeparator'
import { MessageInput } from './MessageInput'
import { InquiryPinnedCard } from './InquiryPinnedCard'
import { AcceptedSystemCard } from './AcceptedSystemCard'

const DEAL_ACCEPTED_PREFIX = '::deal_accepted::'
const PAYMENT_REQUEST_PREFIX = '::payment_request::'
const PAID_PREFIX = '::paid::'
const BOOKED_BY_OTHER_PREFIX = '::booked_by_other::'

interface ConversationData {
  id: string
  listing_id: string
  supplier_id: string
  consumer_id: string
  listings: {
    id: string
    title: string
    type: string
    price_per_month: number | null
    available_from: string | null
    available_to: string | null
    neighborhood: string | null
    thumbnailUrl: string | null
  } | null
  supplier: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  consumer: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  inquiry: {
    id: string
    message: string
    move_in_date: string | null
    move_out_date: string | null
    status: InquiryStatus
    consumer_id: string
  } | null
}

interface ThreadViewProps {
  conversation: ConversationData
  initialMessages: Message[]
  currentUserId: string
  hasPaid: boolean
  /**
   * Whether the supplier's Stripe Connect account is fully active.
   * Drives the accept-gate inside `InquiryPinnedCard` so sublet
   * inquiries can't be accepted before the host can receive money.
   */
  supplierPayoutReady: boolean
  /**
   * The other party's contact, revealed in the accepted-card after a
   * match when payments are disabled. Null otherwise.
   */
  otherContact?: {
    name: string | null
    email: string | null
    phone: string | null
  } | null
}

const QUICK_PROMPTS = [
  'Is the rent negotiable?',
  'Are utilities included?',
  'Can I tour the place?',
  'How many roommates?',
]

function sameDay(a: string, b: string) {
  return format(parseISO(a), 'yyyy-MM-dd') === format(parseISO(b), 'yyyy-MM-dd')
}

export function ThreadView({
  conversation,
  initialMessages,
  currentUserId,
  hasPaid,
  supplierPayoutReady,
  otherContact,
}: ThreadViewProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const scrollerRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const isSupplier = currentUserId === conversation.supplier_id
  const isConsumer = currentUserId === conversation.consumer_id
  const other = isSupplier ? conversation.consumer : conversation.supplier
  const otherInitials =
    other?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ??
    '?'

  // Auto-scroll to bottom on mount + new message
  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages.length, scrollToBottom])

  // Refresh navbar unread badge once messages mount (server has marked them read)
  useEffect(() => {
    router.refresh()
  }, [router])

  // Realtime subscription — listens for both INSERT (new messages from
  // either side) and UPDATE (e.g. is_read flipping when the other party
  // opens the thread). The UPDATE listener is what makes the sender's
  // single-check (delivered) flip to double-check (read) live.
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
        payload => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // De-dupe by real id (handles realtime echo of our own
            // server insert) AND by content match against pending
            // optimistic messages (so the temp row gets replaced by
            // the real one instead of duplicated).
            if (prev.some(m => m.id === newMsg.id)) return prev
            const optimisticIdx = prev.findIndex(
              m =>
                m.id.startsWith('temp-') &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content,
            )
            if (optimisticIdx >= 0) {
              const next = [...prev]
              next[optimisticIdx] = newMsg
              return next
            }
            return [...prev, newMsg]
          })
          setFreshIds(prev => {
            const next = new Set(prev)
            next.add(newMsg.id)
            return next
          })
          if (newMsg.sender_id !== currentUserId) {
            // Mark read immediately on the client (don't wait for a
            // server round-trip + refresh — it makes the unread badge
            // lag). The DB update + nav refresh still happen below.
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => router.refresh())
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        payload => {
          // Reflect read-receipt and other field changes onto our
          // in-memory list. This is what makes the sender's "delivered"
          // check turn into "read" double-check as soon as the other
          // person opens the thread.
          const updated = payload.new as Message
          setMessages(prev =>
            prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, currentUserId, supabase, router])

  async function handleSend(text: string) {
    // Optimistic insert: stick a temp message into local state
    // immediately so the bubble appears the instant the user hits send.
    // Realtime will replace this temp row with the real one once the
    // DB returns (see INSERT handler above — it swaps by matching
    // sender + content).
    const tempId = `temp-${crypto.randomUUID()}`
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    }
    setMessages(prev => [...prev, tempMsg])
    setFreshIds(prev => {
      const next = new Set(prev)
      next.add(tempId)
      return next
    })

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        content: text,
      })
      .select('*')
      .single()

    if (error) {
      // Roll the optimistic message back out so the user sees the send failed.
      setMessages(prev => prev.filter(m => m.id !== tempId))
      throw error
    }

    if (data) {
      // Replace temp with real, in case realtime hasn't fired yet.
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? (data as Message) : m)),
      )
    }
  }

  const listing = conversation.listings
  const inquiry = conversation.inquiry

  return (
    <div className="relative flex flex-col h-full isolate overflow-hidden">
      <MessageAtmosphere />

      {/* Header */}
      <ThreadHeader
        otherName={other?.full_name ?? null}
        otherAvatarUrl={other?.avatar_url ?? null}
        otherInitials={otherInitials}
        listingId={listing?.id ?? null}
        listingTitle={listing?.title ?? null}
        listingNeighborhood={listing?.neighborhood ?? null}
        listingThumbnail={listing?.thumbnailUrl ?? null}
        active
      />

      {/* Scrollable thread */}
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-5 space-y-1.5"
      >
        {/* Pinned inquiry card */}
        {inquiry && listing && (
          <div className="mb-4">
            <InquiryPinnedCard
              inquiry={inquiry}
              listing={{
                id: listing.id,
                title: listing.title,
                type: listing.type,
                price_per_month: listing.price_per_month,
                available_from: listing.available_from,
                available_to: listing.available_to,
                thumbnailUrl: listing.thumbnailUrl,
              }}
              isSupplier={isSupplier}
              supplierPayoutReady={supplierPayoutReady}
            />
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null
            const next = i < messages.length - 1 ? messages[i + 1] : null
            const showDate = !prev || !sameDay(prev.created_at, msg.created_at)
            const isMe = msg.sender_id === currentUserId
            const fresh = freshIds.has(msg.id)

            // System messages
            if (msg.content.startsWith(DEAL_ACCEPTED_PREFIX)) {
              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator iso={msg.created_at} />}
                  <AcceptedSystemCard
                    rawContent={msg.content}
                    createdAtIso={msg.created_at}
                    isConsumer={isConsumer}
                    hasPaid={hasPaid}
                    defaultTitle={listing?.title}
                    defaultType={listing?.type}
                    otherContact={otherContact}
                  />
                </div>
              )
            }
            if (msg.content.startsWith(PAYMENT_REQUEST_PREFIX)) {
              const dataStr = msg.content.slice(PAYMENT_REQUEST_PREFIX.length)
              let data: { title?: string; price?: number } = {}
              try {
                data = JSON.parse(dataStr)
              } catch {}
              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator iso={msg.created_at} />}
                  <div className="flex justify-center my-3">
                    <div className="rounded-2xl px-4 py-2.5 bg-white/85 backdrop-blur border border-line text-[13px] text-ink-soft">
                      <span className="font-medium text-ink">{data.title}</span>
                      {data.price ? (
                        <span className="ml-2 text-ink-muted">
                          ${(data.price / 100).toLocaleString()}/mo
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            }
            if (msg.content.startsWith(PAID_PREFIX)) {
              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator iso={msg.created_at} />}
                  <div className="flex justify-center my-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
                      style={{
                        background: 'oklch(0.55 0.15 142 / 0.15)',
                        color: 'oklch(0.40 0.13 142)',
                      }}
                    >
                      Payment received · booking confirmed
                    </div>
                  </div>
                </div>
              )
            }

            // System pill posted when this inquiry was beaten to the
            // payment by another accepted consumer on the same listing.
            // No payment was taken from the recipient (any duplicate
            // charge was auto-refunded by the webhook).
            if (msg.content.startsWith(BOOKED_BY_OTHER_PREFIX)) {
              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator iso={msg.created_at} />}
                  <div className="flex justify-center my-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-center max-w-[320px] leading-snug"
                      style={{
                        background: 'oklch(0.95 0.04 25)',
                        color: 'oklch(0.45 0.15 25)',
                      }}
                    >
                      This place was booked by someone else. No payment taken.
                    </div>
                  </div>
                </div>
              )
            }

            // Regular bubble — show avatar only on last in a received-side group
            const isLastInGroup =
              !next ||
              next.sender_id !== msg.sender_id ||
              !sameDay(msg.created_at, next.created_at)

            return (
              <div key={msg.id}>
                {showDate && <DateSeparator iso={msg.created_at} />}
                <MessageBubble
                  id={msg.id}
                  content={msg.content}
                  createdAt={msg.created_at}
                  isMe={isMe}
                  isRead={msg.is_read}
                  isFresh={fresh}
                  showAvatar={!isMe && isLastInGroup}
                  otherAvatarUrl={other?.avatar_url ?? null}
                  otherInitials={otherInitials}
                />
              </div>
            )
          })}
        </AnimatePresence>

        {messages.length === 0 && !inquiry && (
          <p className="text-center text-sm text-ink-muted py-12">
            No messages yet. Say hello!
          </p>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        quickPrompts={messages.length < 3 ? QUICK_PROMPTS : undefined}
      />
    </div>
  )
}
