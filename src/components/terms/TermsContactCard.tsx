import { EnvelopeSimple, ArrowUpRight } from '@phosphor-icons/react/dist/ssr'

/**
 * Bottom-of-page contact card replacing the raw `mailto:` anchor.
 * Branded glassmorphism panel with magnetic-feel hover.
 */
export function TermsContactCard() {
  return (
    <a
      href="mailto:legal@wroomly.com"
      className="
        group relative block rounded-3xl overflow-hidden
        border border-line bg-white/85 backdrop-blur-xl
        p-5 sm:p-6
        shadow-[0_2px_12px_oklch(0_0_0/0.04)]
        hover:shadow-[0_18px_50px_oklch(0.10_0.02_260/0.10)]
        transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        hover:-translate-y-0.5
      "
      style={{
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 2px 12px oklch(0 0 0 / 0.04)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-20 -right-12 w-60 h-60 rounded-full blur-3xl opacity-30"
        style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
        aria-hidden
      />

      <div className="relative flex items-center gap-4">
        <div
          className="
            shrink-0 w-12 h-12 rounded-2xl
            flex items-center justify-center
            transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
            group-hover:scale-110 group-hover:-rotate-[6deg]
          "
          style={{
            background: 'oklch(0.10 0.02 260)',
            color: 'oklch(0.84 0.17 85)',
          }}
        >
          <EnvelopeSimple size={20} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-muted font-semibold">
            Questions?
          </p>
          <p className="font-display text-lg sm:text-xl tracking-tight text-ink mt-0.5 leading-tight">
            Reach our legal team at{' '}
            <span className="italic font-light text-[oklch(0.45_0.13_85)]">
              legal@wroomly.com
            </span>
          </p>
        </div>
        <ArrowUpRight
          size={18}
          weight="bold"
          className="
            shrink-0 text-ink-muted
            transition-all duration-300
            group-hover:text-[oklch(0.45_0.13_85)]
            group-hover:translate-x-0.5 group-hover:-translate-y-0.5
          "
        />
      </div>
    </a>
  )
}
