import {
  ShieldCheck,
  Warning,
  Bank,
  ArrowSquareOut,
} from '@phosphor-icons/react/dist/ssr'
import type { ConnectStatus } from '@/lib/stripe'
import { ConnectStripeButton } from './ConnectStripeButton'

interface PayoutAccountCardProps {
  status: ConnectStatus
  detailsSubmitted: boolean
}

/**
 * The supplier-facing "where your money goes" tile that lives at the
 * top of `/payouts`. State-driven copy + a `ConnectStripeButton` that
 * jumps to the right Stripe destination (onboarding for none/incomplete,
 * Express dashboard for active).
 */
export function PayoutAccountCard({
  status,
  detailsSubmitted,
}: PayoutAccountCardProps) {
  const tone =
    status === 'active'
      ? 'success'
      : status === 'incomplete'
        ? 'warn'
        : 'neutral'

  const Icon =
    tone === 'success' ? ShieldCheck : tone === 'warn' ? Warning : Bank

  const eyebrow =
    status === 'active'
      ? 'Connected'
      : status === 'incomplete'
        ? 'Action needed'
        : 'Set up payouts'

  const title =
    status === 'active'
      ? 'Stripe is paying you directly.'
      : status === 'incomplete'
        ? 'Stripe still wants a couple of details.'
        : 'Connect Stripe to start receiving rent.'

  const body =
    status === 'active'
      ? 'Rent is routed to your bank on Stripe’s standard schedule — usually 2 business days after a booking clears. Manage payout schedule and bank info from your Stripe dashboard.'
      : status === 'incomplete'
        ? detailsSubmitted
          ? 'Stripe is verifying your info. If they ask for more, the link below will pick up where you left off.'
          : 'You started Express onboarding but didn’t finish. Finish the form to start accepting bookings.'
        : 'It takes about five minutes — Stripe handles the legal and bank verification side. Wroomly never sees your bank account.'

  const tileBg =
    tone === 'success'
      ? 'oklch(0.55 0.15 142)' // emerald
      : tone === 'warn'
        ? 'oklch(0.65 0.15 75)' // amber
        : 'oklch(0.10 0.02 260)' // navy

  const tileFg =
    tone === 'success'
      ? 'white'
      : tone === 'warn'
        ? 'oklch(0.15 0.05 75)'
        : 'oklch(0.84 0.17 85)'

  const borderAccent =
    tone === 'success'
      ? 'oklch(0.55 0.15 142 / 0.35)'
      : tone === 'warn'
        ? 'oklch(0.65 0.15 75 / 0.40)'
        : 'oklch(0.84 0.17 85 / 0.35)'

  const meshAccent =
    tone === 'success'
      ? 'oklch(0.55 0.15 142 / 0.18)'
      : tone === 'warn'
        ? 'oklch(0.65 0.15 75 / 0.22)'
        : 'oklch(0.84 0.17 85 / 0.30)'

  return (
    <div
      className="relative rounded-3xl overflow-hidden border bg-white/85 backdrop-blur-xl"
      style={{
        borderColor: borderAccent,
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 6px 24px oklch(0 0 0 / 0.05)',
      }}
    >
      {/* Mesh accent in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 w-60 h-60 rounded-full blur-3xl opacity-50"
        style={{ background: meshAccent }}
      />

      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_6px_20px_oklch(0_0_0/0.08)]"
          style={{ background: tileBg, color: tileFg }}
        >
          <Icon size={20} weight="duotone" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[10.5px] uppercase tracking-[0.18em] font-semibold"
            style={{
              color:
                tone === 'success'
                  ? 'oklch(0.40 0.13 142)'
                  : tone === 'warn'
                    ? 'oklch(0.40 0.13 75)'
                    : 'oklch(0.32 0.10 85)',
            }}
          >
            {eyebrow}
          </p>
          <p className="font-display text-lg sm:text-xl tracking-tight text-ink mt-0.5 leading-tight">
            {title}
          </p>
          <p className="text-[13.5px] text-ink-soft mt-2 leading-relaxed max-w-[55ch]">
            {body}
          </p>
        </div>

        <div className="shrink-0 inline-flex items-center gap-2">
          <ConnectStripeButton status={status} variant="solid" />
          {status === 'active' && (
            <ArrowSquareOut
              size={14}
              weight="bold"
              className="text-ink-muted/70 hidden sm:inline-block"
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  )
}
