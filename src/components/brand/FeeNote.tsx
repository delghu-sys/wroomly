import { PLATFORM_FEE_PERCENT } from '@/lib/fees'

interface FeeNoteProps {
  /**
   * `inline` — small grey line for under-price contexts.
   * `pill`  — chip-style accent for sidebar / modal headers.
   */
  variant?: 'inline' | 'pill'
}

/**
 * A small, consistent disclosure that Wroomly's service fee is added
 * on top of the listed rent at checkout. Render this near every place
 * the rent is shown *before* the consumer reaches Stripe — the hosted
 * Checkout UI shows the full breakdown, but we want no surprises.
 */
export function FeeNote({ variant = 'inline' }: FeeNoteProps) {
  if (variant === 'pill') {
    return (
      <span
        className="
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full
          text-[10.5px] font-semibold tracking-wide
        "
        style={{
          background: 'oklch(0.84 0.17 85 / 0.15)',
          color: 'oklch(0.32 0.10 85)',
        }}
      >
        + {PLATFORM_FEE_PERCENT}% fee + processing
      </span>
    )
  }
  return (
    <span className="text-[11.5px] text-ink-muted leading-snug">
      + {PLATFORM_FEE_PERCENT}% service fee + card processing at checkout
    </span>
  )
}
