'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Search, X, MessageSquare } from 'lucide-react'
import { ConversationListItem, type ConversationListItemData } from './ConversationListItem'
import { EmptyState } from '@/components/brand/EmptyState'

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
                background: 'color-mix(in oklab, var(--maize-bright) 18%, transparent)',
                color: 'oklch(0.32 0.10 85)',
              }}
            >
              {totalUnread} unread
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-maize-bright/12 flex items-center justify-center pointer-events-none group-focus-within:bg-maize-bright/25 transition-colors">
            <Search className="w-3.5 h-3.5 text-gold-deep" strokeWidth={2} />
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="h-11 w-full rounded-2xl bg-surface border border-line pl-11 pr-9 text-sm text-ink placeholder:text-ink-muted/65 shadow-1 focus:outline-none focus:ring-4 focus:ring-maize-bright/18 focus:border-gold-deep transition-all duration-300"
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
            <EmptyState
              size="sm"
              className="border-0 bg-transparent backdrop-blur-none"
              icon={<Search className="w-5 h-5" strokeWidth={1.75} />}
              title="No matches"
              description="Try a different search term."
            />
          ) : (
            <EmptyState
              size="sm"
              className="border-0 bg-transparent backdrop-blur-none"
              icon={<MessageSquare className="w-5 h-5" strokeWidth={1.75} />}
              title="No conversations yet"
              description="Send an inquiry on a listing to start your first chat."
            />
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
