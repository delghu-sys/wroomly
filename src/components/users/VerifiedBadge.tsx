import { SealCheck } from '@phosphor-icons/react/dist/ssr'

/**
 * The blue "UMich verified" check. Shown ONLY for accounts whose is_verified is
 * true — i.e. confirmed via UMich Google SSO (or legacy @umich.edu / admin).
 * Render it next to a user's name anywhere they appear (cards, threads,
 * inquiries, reviews, profiles) so the trust signal is visible, not assumed.
 *
 * `label` renders the labelled chip form (profile headers); omit it for the
 * compact inline check beside a name. Server-renderable (ssr icon import).
 */

// Brand blue — the same #2F6BFF used across Match + emails. The verified check
// is deliberately blue (the universal "verified" convention), distinct from the
// maize brand accent, so it reads instantly as an identity signal.
const BLUE = '#2F6BFF'

export function VerifiedBadge({
  size = 16,
  label = false,
  className = '',
}: {
  size?: number
  /** Show the "UMich verified" pill instead of the bare check. */
  label?: boolean
  className?: string
}) {
  if (label) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-[oklch(0.55_0.22_264/0.10)] px-2 py-0.5 text-[11px] font-semibold text-[#2F6BFF] ${className}`}
      >
        <SealCheck size={size} weight="fill" style={{ color: BLUE }} aria-hidden />
        UMich verified
      </span>
    )
  }
  return (
    <SealCheck
      size={size}
      weight="fill"
      style={{ color: BLUE }}
      className={`inline-block shrink-0 align-middle ${className}`}
      aria-label="UMich verified"
    />
  )
}
