'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface MessageBubbleProps {
  id: string
  content: string
  createdAt: string
  isMe: boolean
  isRead?: boolean
  /** True when this is a newly-arrived realtime message (bouncier spring). */
  isFresh?: boolean
  /** Show the counterparty avatar (last in a received-side group). */
  showAvatar?: boolean
  otherAvatarUrl?: string | null
  otherInitials?: string
}

const baseSpring = { type: 'spring' as const, stiffness: 100, damping: 20 }
const freshSpring = { type: 'spring' as const, stiffness: 120, damping: 14 }

/**
 * One chat message bubble. Memoized — only re-renders when its own
 * props change. New realtime messages get a bouncier spring.
 *
 * Sent (right): navy bg + accent text, flat bottom-right corner.
 * Received (left): glass white surface, flat bottom-left corner.
 */
export const MessageBubble = memo(function MessageBubble({
  content,
  createdAt,
  isMe,
  isRead,
  isFresh,
  showAvatar,
  otherAvatarUrl,
  otherInitials,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: isFresh ? 0.94 : 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={isFresh ? freshSpring : baseSpring}
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
      style={{ willChange: 'transform, opacity' }}
    >
      {!isMe && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar className="h-7 w-7 ring-1 ring-line">
              <AvatarImage src={otherAvatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px] bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold">
                {otherInitials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={`
          relative max-w-[78%] sm:max-w-[68%] px-4 py-2.5 text-[14.5px] leading-[1.45]
          rounded-[1.25rem] shadow-[0_1px_2px_oklch(0_0_0/0.05)]
          ${
            isMe
              ? 'bg-[oklch(0.18_0.025_255)] text-white rounded-br-[4px]'
              : 'bg-white/85 backdrop-blur-xl text-ink border border-white/60 rounded-bl-[4px]'
          }
        `}
        style={
          isMe
            ? undefined
            : { boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 1px 2px oklch(0 0 0 / 0.05)' }
        }
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <p
          className={`mt-1 flex items-center gap-1 text-[10.5px] font-medium tabular-nums ${
            isMe ? 'text-white/55 justify-end' : 'text-ink-muted'
          }`}
        >
          {format(parseISO(createdAt), 'h:mm a')}
          {isMe &&
            (isRead ? (
              <CheckCheck
                className="w-3.5 h-3.5"
                style={{ color: 'oklch(0.84 0.17 85)' }}
                strokeWidth={2.25}
              />
            ) : (
              <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
            ))}
        </p>
      </div>
    </motion.div>
  )
})
