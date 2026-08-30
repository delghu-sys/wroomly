import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The one empty state.
 *
 * There were fourteen of these, hand-rolled, in three different visual
 * systems — the icon tile alone came in w-12/w-14/w-20/w-24, and half used a
 * muted `bg-navy-soft text-navy` while the other half used the bold navy tile
 * with a maize glyph. Copy drifted with it: "No applications yet" existed
 * twice with two different second sentences.
 *
 * This settles on the bold tile, because that is what the two hero empty
 * states (browse, messages) already use and what reads as Wroomly rather than
 * as a generic dashboard.
 *
 * `accent` is the italic gold tail on the headline. It is optional but worth
 * using: "No listings yet" is a system message, "No listings yet — your move."
 * sounds like a person wrote it, and that difference is most of why the flat
 * ones felt machine-made.
 */

type Size = 'sm' | 'md'

export interface EmptyStateProps {
  /** Rendered inside the tile. Size it w-6 h-6 for md, w-5 h-5 for sm. */
  icon?: ReactNode
  title: string
  /** Italic gold tail on the headline. */
  accent?: string
  description?: ReactNode
  action?: {
    label: string
    href: string
    /** primary = maize fill (do this next). secondary = navy fill. */
    variant?: 'primary' | 'secondary'
  }
  /** md = a page's main slot. sm = inside a sidebar or column. */
  size?: Size
  className?: string
}

const SIZES = {
  md: {
    pad: 'py-20',
    tile: 'w-14 h-14 rounded-2xl mb-4',
    title: 'font-display text-2xl text-ink',
    body: 'text-sm text-ink-muted mt-2 max-w-sm mx-auto leading-relaxed',
  },
  sm: {
    pad: 'py-12 px-4',
    tile: 'w-12 h-12 rounded-2xl mb-3',
    title: 'font-display text-base text-ink',
    body: 'text-xs text-ink-muted mt-1.5 leading-relaxed',
  },
} satisfies Record<Size, Record<string, string>>

export function EmptyState({
  icon,
  title,
  accent,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const s = SIZES[size]

  return (
    <div
      className={`text-center rounded-3xl border border-dashed border-line bg-white/55 backdrop-blur-sm ${s.pad} ${className}`}
    >
      {icon ? (
        <div
          className={`inline-flex items-center justify-center bg-navy-deep text-maize-bright ${s.tile}`}
        >
          {icon}
        </div>
      ) : null}

      {/* <p>, not a heading: every page that renders this already has its own
          h1 above, and an empty result is not a new section of the document. */}
      <p className={s.title}>
        {title}
        {accent ? (
          <>
            {' '}
            <span className="italic font-light text-gold-deep">{accent}</span>
          </>
        ) : null}
      </p>

      {description ? <p className={s.body}>{description}</p> : null}

      {action ? (
        <Link
          href={action.href}
          className={`press inline-flex items-center justify-center h-11 px-6 mt-6 rounded-full text-sm font-semibold tracking-tight transition-shadow duration-500 ${
            action.variant === 'secondary'
              ? 'bg-navy-deep text-maize-bright hover:shadow-glow-navy'
              : 'bg-maize-bright text-navy-deep hover:shadow-glow-maize'
          }`}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
