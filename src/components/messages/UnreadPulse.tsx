'use client'

import { memo } from 'react'

/**
 * Maize unread indicator with an infinite breathe-pulse.
 * Isolated + memoized so the perpetual animation never triggers
 * re-renders of the conversation row.
 */
export const UnreadPulse = memo(function UnreadPulse({
  count,
}: {
  count?: number
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-70"
        style={{ background: 'oklch(0.84 0.17 85)' }}
        aria-hidden
      />
      <span
        className="relative inline-flex h-2.5 min-w-2.5 px-1 rounded-full items-center justify-center text-[9px] font-bold"
        style={{
          background: 'oklch(0.84 0.17 85)',
          color: 'oklch(0.10 0.02 260)',
        }}
      >
        {count && count > 1 ? (count > 9 ? '9+' : count) : ''}
      </span>
    </span>
  )
})
