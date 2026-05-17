'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CreditCard, CheckCircle2, BedDouble } from 'lucide-react'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { UnreadPulse } from './UnreadPulse'

export interface ConversationListItemData {
  id: string
  otherName: string | null
  otherAvatarUrl: string | null
  otherInitials: string
  listingId: string | null
  listingTitle: string | null
  listingThumbnail: string | null
  lastMessage: { content: string; senderId: string; createdAt: string } | null
  unread: number
  currentUserId: string
}

function relativeTime(iso: string): string {
  try {
    const d = parseISO(iso)
    const diffMs = Date.now() - d.getTime()
    const diffMin = diffMs / 60000
    if (diffMin < 1) return 'now'
    if (diffMin < 60) return `${Math.floor(diffMin)}m`
    return formatDistanceToNowStrict(d, { addSuffix: false })
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' weeks', 'w')
      .replace(' week', 'w')
      .replace(' months', 'mo')
      .replace(' month', 'mo')
      .replace(' years', 'y')
      .replace(' year', 'y')
  } catch {
    return ''
  }
}

function previewLabel(content: string): { text: string; icon?: 'payment' | 'accepted' } {
  if (content.startsWith('::payment_request::'))
    return { text: 'Payment request', icon: 'payment' }
  if (content.startsWith('::deal_accepted::'))
    return { text: 'Inquiry accepted', icon: 'accepted' }
  if (content.startsWith('::paid::')) return { text: 'Payment confirmed', icon: 'accepted' }
  return { text: content }
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }
const rowItem = {
  initial: { opacity: 0, x: -18 },
  animate: { opacity: 1, x: 0, transition: spring },
}

interface ConversationListItemProps {
  data: ConversationListItemData
  active: boolean
}

export function ConversationListItem({ data, active }: ConversationListItemProps) {
  const {
    id,
    otherName,
    otherAvatarUrl,
    otherInitials,
    listingTitle,
    listingThumbnail,
    lastMessage,
    unread,
    currentUserId,
  } = data

  const preview = lastMessage ? previewLabel(lastMessage.content) : null
  const isSender = lastMessage?.senderId === currentUserId
  const time = lastMessage ? relativeTime(lastMessage.createdAt) : ''
  const hasUnread = unread > 0

  return (
    <motion.div variants={rowItem} className="relative">
      <Link
        href={`/messages/${id}`}
        prefetch={false}
        className={`
          relative flex items-center gap-3 px-3 py-3 rounded-2xl group
          transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.25)]
          ${active ? '' : 'hover:bg-white/60'}
        `}
      >
        {/* Active background — layoutId so it slides between rows */}
        {active && (
          <motion.span
            layoutId="convo-active-bg"
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="absolute inset-0 rounded-2xl border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_1px_2px_oklch(0_0_0/0.04),_0_8px_24px_oklch(0_0_0/0.04)] pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 8px 24px oklch(0 0 0 / 0.04)' }}
          />
        )}
        {/* Active left indicator — animated maize bar */}
        {active && (
          <motion.span
            layoutId="convo-active-indicator"
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full pointer-events-none"
            style={{ background: 'oklch(0.84 0.17 85)' }}
            aria-hidden
          />
        )}

        {/* Avatar + listing thumbnail stacked */}
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 ring-1 ring-line">
            <AvatarImage src={otherAvatarUrl ?? undefined} />
            <AvatarFallback
              className="text-xs font-semibold"
              style={{
                background: 'oklch(0.10 0.02 260)',
                color: 'oklch(0.84 0.17 85)',
              }}
            >
              {otherInitials}
            </AvatarFallback>
          </Avatar>
          {/* Listing thumbnail — small rounded square at bottom-right */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md overflow-hidden ring-2 ring-background bg-white">
            {listingThumbnail ? (
              <Image
                src={listingThumbnail}
                alt=""
                width={20}
                height={20}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[oklch(0.95_0.01_85)]">
                <BedDouble className="w-2.5 h-2.5 text-ink-muted/60" strokeWidth={2} />
              </div>
            )}
          </div>
        </div>

        {/* Text column */}
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p
              className={`text-[14px] truncate ${
                hasUnread ? 'font-semibold text-ink' : 'font-medium text-ink-soft'
              }`}
            >
              {otherName ?? 'Unknown'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {time && (
                <span
                  className={`text-[10.5px] tabular-nums tracking-wide ${
                    hasUnread ? 'text-[oklch(0.45_0.13_85)] font-semibold' : 'text-ink-muted'
                  }`}
                >
                  {time}
                </span>
              )}
              {hasUnread && <UnreadPulse count={unread} />}
            </div>
          </div>

          <p className="text-[11.5px] tracking-wide font-medium text-[oklch(0.45_0.13_85)] truncate mb-0.5 group-hover:text-[oklch(0.32_0.10_85)] transition-colors">
            {listingTitle ?? '—'}
          </p>

          {preview && (
            <div
              className={`flex items-center gap-1.5 text-[13px] truncate ${
                hasUnread ? 'font-medium text-ink' : 'text-ink-muted'
              }`}
            >
              {preview.icon === 'payment' && (
                <CreditCard
                  className="w-3.5 h-3.5 shrink-0 text-[oklch(0.45_0.13_85)]"
                  strokeWidth={1.75}
                />
              )}
              {preview.icon === 'accepted' && (
                <CheckCircle2
                  className="w-3.5 h-3.5 shrink-0 text-emerald-500"
                  strokeWidth={2}
                />
              )}
              <span className="truncate">
                {isSender && <span className="text-ink-muted">You: </span>}
                {preview.text}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
