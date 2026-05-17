import { Star } from '@phosphor-icons/react/dist/ssr'

interface StarRatingProps {
  /** Rating value 0–5 (supports halves). */
  value: number
  /** Star size in px. */
  size?: number
  /** Show the numeric value next to the stars. */
  showValue?: boolean
  /** Optional count appended in muted parens. */
  count?: number
  className?: string
}

/**
 * Brand-colored star row using Phosphor's `Star` glyph.
 * Half-stars rendered by clipping the filled star to 50% width.
 * Server-renderable — no animation, no JS.
 */
export function StarRating({
  value,
  size = 16,
  showValue = false,
  count,
  className = '',
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value))
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => {
          const fillPct =
            clamped >= n ? 1 : clamped + 1 > n ? clamped - (n - 1) : 0
          return (
            <span
              key={n}
              className="relative inline-flex"
              style={{ width: size, height: size }}
              aria-hidden
            >
              {/* Empty (outline) */}
              <Star
                size={size}
                weight="regular"
                style={{ color: 'oklch(0.70 0.02 92 / 0.50)' }}
                className="absolute inset-0"
              />
              {/* Filled — clipped to fillPct */}
              {fillPct > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPct * 100}%` }}
                >
                  <Star
                    size={size}
                    weight="fill"
                    style={{ color: 'oklch(0.84 0.17 85)' }}
                  />
                </span>
              )}
            </span>
          )
        })}
      </span>
      {showValue && (
        <span className="font-medium text-ink text-[12.5px] tabular-nums ml-1">
          {clamped.toFixed(1)}
        </span>
      )}
      {typeof count === 'number' && (
        <span className="text-[12px] text-ink-muted tabular-nums">
          ({count})
        </span>
      )}
    </span>
  )
}
