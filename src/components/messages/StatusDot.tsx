'use client'

import { memo } from 'react'

interface StatusDotProps {
  /** When true → emerald breathing pulse. When false → static muted dot. */
  active?: boolean
  /** Optional label (e.g. "Active now" / "Last seen 3h ago") */
  label?: string
}

/**
 * Live presence indicator. Memoized so the perpetual pulse never
 * re-renders the parent header.
 */
export const StatusDot = memo(function StatusDot({
  active = true,
  label,
}: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted font-medium">
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
        )}
        <span
          className={`rounded-full h-1.5 w-1.5 ${
            active ? 'bg-emerald-400' : 'bg-ink-muted/40'
          }`}
        />
      </span>
      {label}
    </span>
  )
})
