import type { ReactNode } from 'react'

interface TermsSectionProps {
  id: string
  n: string
  title: string
  children: ReactNode
}

/**
 * One Terms-of-Service section.
 *
 * Layout: a massive display-font watermark number in the background,
 * the section title in display style, and the body content.
 *
 * Body styling: `<strong>` tags inside are auto-rendered in maize via a
 * descendant selector — no need to wrap them at every call site.
 */
export function TermsSection({ id, n, title, children }: TermsSectionProps) {
  return (
    <section
      id={id}
      className="
        relative scroll-mt-24
        [&_strong]:font-semibold
        [&_strong]:text-[oklch(0.32_0.10_85)]
        [&_p]:text-ink-soft
        [&_p]:leading-relaxed
        [&_p]:max-w-[68ch]
        [&_p]:mt-4
        [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:max-w-[68ch]
        [&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:max-w-[68ch]
        [&_ul>li]:text-ink-soft [&_ul>li]:leading-relaxed [&_ul>li]:pl-5 [&_ul>li]:relative
        [&_ul>li]:before:content-[''] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.7em]
        [&_ul>li]:before:w-2 [&_ul>li]:before:h-px
        [&_ul>li]:before:bg-[oklch(0.84_0.17_85)]
        [&_ol>li]:text-ink-soft [&_ol>li]:leading-relaxed [&_ol>li]:pl-1
        [&_ol>li::marker]:text-[oklch(0.45_0.13_85)] [&_ol>li::marker]:font-semibold
        [&_a]:text-[oklch(0.45_0.13_85)] [&_a]:underline-offset-4 [&_a]:underline
      "
    >
      {/* Watermark section number — kept under 10% so it reads as
          atmospheric backdrop, not content. */}
      <span
        className="
          pointer-events-none absolute -top-4 sm:-top-6 -left-2 sm:-left-3
          font-display tracking-tighter leading-none italic font-light
          text-[clamp(5rem,12vw,9rem)] select-none
        "
        style={{ color: 'oklch(0.84 0.17 85 / 0.08)' }}
        aria-hidden
      >
        {n.padStart(2, '0')}
      </span>

      <div className="relative pt-2 sm:pt-4">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="text-[10.5px] tabular-nums font-semibold tracking-[0.15em]"
            style={{ color: 'oklch(0.45 0.13 85)' }}
          >
            §{n}
          </span>
          <span
            className="h-px flex-1 max-w-12"
            style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
            aria-hidden
          />
        </div>
        <h2 className="font-display text-[clamp(1.5rem,2.5vw,2rem)] tracking-tight text-ink leading-[1.05]">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}
