import { SealCheck } from '@phosphor-icons/react/dist/ssr'

interface VerifiedSealProps {
  size?: number
  /** When true, show a subtle ring ping. Default true. */
  pulse?: boolean
  className?: string
}

/**
 * Animated maize verified seal (Phosphor SealCheck).
 * Pure CSS animation — server-renderable; muted automatically by the
 * `prefers-reduced-motion` rules in globals.css.
 */
export function VerifiedSeal({
  size = 22,
  pulse = true,
  className = '',
}: VerifiedSealProps) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-label="Verified">
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ background: 'oklch(0.84 0.17 85)' }}
          aria-hidden
        />
      )}
      <SealCheck
        size={size}
        weight="fill"
        style={{ color: 'oklch(0.84 0.17 85)' }}
        className="relative"
      />
    </span>
  )
}
