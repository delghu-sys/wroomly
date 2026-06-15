import type { ReactNode } from 'react'
import { Warning } from '@phosphor-icons/react/dist/ssr'

interface TermsCalloutProps {
  title: string
  children: ReactNode
}

/**
 * Glassmorphism callout for the high-stakes sections of the ToS
 * (supplier liability, limitation of liability, dispute resolution).
 * Pure server-renderable — no JS.
 */
export function TermsCallout({ title, children }: TermsCalloutProps) {
  return (
    <aside
      className="
        not-prose relative my-6
        rounded-3xl overflow-hidden
        border border-[oklch(0.84_0.17_85/0.35)]
        bg-white/85 backdrop-blur-xl
        shadow-[0_2px_12px_oklch(0_0_0/0.04)]
      "
      style={{
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 6px 24px oklch(0.84 0.17 85 / 0.10)',
      }}
    >
      {/* Mesh accent */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl opacity-40"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
        aria-hidden
      />

      <div className="relative p-5 sm:p-6 flex gap-4">
        <div
          className="
            shrink-0 w-10 h-10 rounded-2xl
            flex items-center justify-center
            shadow-[0_4px_14px_oklch(0.84_0.17_85/0.30)]
          "
          style={{
            background: 'oklch(0.22 0.075 256)',
            color: 'oklch(0.84 0.17 85)',
          }}
        >
          <Warning size={18} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-[oklch(0.32_0.10_85)] font-semibold">
            Read this carefully
          </p>
          <p className="font-display text-lg sm:text-xl tracking-tight text-ink mt-1 leading-tight">
            {title}
          </p>
          <div className="text-[14.5px] text-ink-soft leading-relaxed mt-3 max-w-[60ch] [&_strong]:font-semibold [&_strong]:text-ink">
            {children}
          </div>
        </div>
      </div>
    </aside>
  )
}
