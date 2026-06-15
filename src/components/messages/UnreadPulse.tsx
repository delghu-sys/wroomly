/**
 * Maize unread indicator with an infinite breathe-pulse.
 * Pure CSS via Tailwind's `animate-ping` — no JS, server-renderable.
 * Pulse is muted automatically via globals.css when the user has
 * `prefers-reduced-motion: reduce`.
 */
export function UnreadPulse({ count }: { count?: number }) {
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
          color: 'oklch(0.22 0.075 256)',
        }}
      >
        {count && count > 1 ? (count > 9 ? '9+' : count) : ''}
      </span>
    </span>
  )
}
