'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Search, X, MessageSquare } from 'lucide-react'
import { ConversationListItem, type ConversationListItemData } from './ConversationListItem'

interface ConversationListProps {
  conversations: ConversationListItemData[]
  activeId?: string
}

const list = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

export function ConversationList({ conversations, activeId }: ConversationListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => {
      return (
        c.otherName?.toLowerCase().includes(q) ||
        c.listingTitle?.toLowerCase().includes(q) ||
        c.lastMessage?.content.toLowerCase().includes(q)
      )
    })
  }, [conversations, query])

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header — title + unread count */}
      <div className="px-4 sm:px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] tracking-tight text-ink leading-[1.02]">
            Inbox
          </h1>
          {totalUnread > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
              style={{
                background: 'oklch(0.84 0.17 85 / 0.18)',
                color: 'oklch(0.32 0.10 85)',
              }}
            >
              {totalUnread} unread
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-[oklch(0.84_0.17_85/0.12)] flex items-center justify-center pointer-events-none group-focus-within:bg-[oklch(0.84_0.17_85/0.25)] transition-colors">
            <Search className="w-3.5 h-3.5 text-[oklch(0.45_0.13_85)]" strokeWidth={2} />
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="h-11 w-full rounded-2xl bg-white border border-line pl-11 pr-9 text-sm text-ink placeholder:text-ink-muted/65 shadow-[0_1px_2px_oklch(0_0_0/0.04)] focus:outline-none focus:ring-4 focus:ring-[oklch(0.84_0.17_85/0.18)] focus:border-[oklch(0.45_0.13_85)] transition-all duration-300"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-ink-muted/10 hover:bg-ink-muted/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-3.5 h-3.5 text-ink-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 pb-4">
        {filtered.length === 0 ? (
          query ? (
            <div className="text-center py-12">
              <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3 bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)]">
                <Search className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <p className="font-display text-base text-ink">No matches</p>
              <p className="text-xs text-ink-muted mt-1.5">
                Try a different search term.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3 bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)]">
                <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <p className="font-display text-base text-ink">No conversations yet</p>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                Send an inquiry on a listing to start your first chat.
              </p>
            </div>
          )
        ) : (
          <motion.ol
            variants={list}
            initial="initial"
            animate="animate"
            className="space-y-0.5"
          >
            {filtered.map(c => (
              <ConversationListItem
                key={c.id}
                data={c}
                active={c.id === activeId}
              />
            ))}
          </motion.ol>
        )}
      </div>
    </div>
  )
}
