import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Visible breadcrumb trail. Pair with breadcrumbJsonLd() for the
 * machine-readable version. Last crumb is the current page (not linked).
 */
export function Breadcrumbs({
  crumbs,
  tone = 'light',
}: {
  crumbs: { name: string; path?: string }[]
  /** 'dark' for use on the navy hero. */
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className={`flex items-center gap-1.5 flex-wrap text-[13px] ${dark ? 'text-white/55' : 'text-ink-muted'}`}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.path && !last ? (
                <Link
                  href={c.path}
                  className={`transition-colors underline-offset-2 hover:underline ${dark ? 'hover:text-white' : 'hover:text-ink'}`}
                >
                  {c.name}
                </Link>
              ) : (
                <span className={last ? (dark ? 'text-white/80 font-medium' : 'text-ink-soft font-medium') : ''}>{c.name}</span>
              )}
              {!last && <ChevronRight className={`w-3.5 h-3.5 ${dark ? 'text-white/30' : 'text-ink-muted/50'}`} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
