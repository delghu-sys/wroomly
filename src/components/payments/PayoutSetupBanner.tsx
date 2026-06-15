import Link from 'next/link'
import { Warning, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import type { ConnectStatus } from '@/lib/fees'

interface PayoutSetupBannerProps {
  status: ConnectStatus
}

/**
 * Dashboard nudge that appears for suppliers who haven't completed
 * Stripe Connect onboarding. Links to /payouts where the full
 * `PayoutAccountCard` lives. Returns null when there's nothing to nudge.
 */
export function PayoutSetupBanner({ status }: PayoutSetupBannerProps) {
  if (status === 'active') return null

  const isStarted = status === 'incomplete'

  return (
    <Link
      href="/payouts"
      className="
        group relative block rounded-2xl overflow-hidden mb-6
        border bg-white/85 backdrop-blur-xl
        transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.25)]
      "
      style={{
        borderColor: 'oklch(0.84 0.17 85 / 0.40)',
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 6px 18px oklch(0.84 0.17 85 / 0.12)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full blur-3xl opacity-50"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
      />

      <div className="relative flex items-center gap-4 p-4 sm:p-5">
        <div
          className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-[0_4px_14px_oklch(0.84_0.17_85/0.30)]"
          style={{
            background: 'oklch(0.22 0.075 256)',
            color: 'oklch(0.84 0.17 85)',
          }}
        >
          <Warning size={18} weight="duotone" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[oklch(0.32_0.10_85)]">
            Payout setup
          </p>
          <p className="font-display text-base sm:text-lg tracking-tight text-ink mt-0.5 leading-tight">
            {isStarted
              ? 'Finish your Stripe onboarding to start accepting bookings.'
              : "You can't accept payments yet — connect Stripe in a couple of minutes."}
          </p>
        </div>

        <ArrowRight
          size={18}
          weight="bold"
          className="shrink-0 text-ink-muted transition-all duration-300 group-hover:text-[oklch(0.45_0.13_85)] group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  )
}
