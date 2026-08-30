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
    <div
      className="
        not-prose relative my-6
        rounded-3xl overflow-hidden
        border border-maize-bright/35
        bg-white/85 backdrop-blur-xl
        shadow-2
      "
      style={{
        boxShadow: 'var(--shadow-edge), var(--shadow-glow-soft)',
      }}
    >
      {/* Mesh accent */}

      <div className="relative p-5 sm:p-6 flex gap-4">
        <div
          className="
            shrink-0 w-10 h-10 rounded-2xl
            flex items-center justify-center
            shadow-glow-maize
          "
          style={{
            background: 'var(--navy-deep)',
            color: 'var(--maize-bright)',
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
    </div>
  )
}
