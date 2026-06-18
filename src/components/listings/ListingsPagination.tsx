import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ListingsPaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  /** Current querystring filters (we preserve all of them across pages). */
  filters: Record<string, string | undefined>
}

/** Build a /listings href that keeps every active filter and sets ?page=N. */
function pageHref(filters: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v && k !== 'page') params.set(k, v)
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/listings?${qs}` : '/listings'
}

/**
 * Compact page list: always show first, last, current, and neighbours, with
 * ellipses for gaps. e.g. [1] … [4] [5] [6] … [12]
 */
function pageWindow(current: number, total: number): (number | '…')[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

export function ListingsPagination({
  currentPage,
  totalPages,
  totalCount,
  filters,
}: ListingsPaginationProps) {
  if (totalPages <= 1) return null

  const items = pageWindow(currentPage, totalPages)
  const linkCls =
    'inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-full text-sm font-medium border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.6)] hover:text-ink transition'
  const activeCls =
    'inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-full text-sm font-semibold bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)]'
  const disabledCls =
    'inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-full text-sm text-ink-muted/40 border border-line/60 cursor-default'

  return (
    <nav className="mt-10 flex flex-col items-center gap-3" aria-label="Listings pagination">
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {currentPage > 1 ? (
          <Link href={pageHref(filters, currentPage - 1)} className={linkCls} rel="prev" aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <span className={disabledCls} aria-hidden><ChevronLeft className="w-4 h-4" /></span>
        )}

        {items.map((it, i) =>
          it === '…' ? (
            <span key={`gap-${i}`} className="px-1.5 text-ink-muted select-none">…</span>
          ) : it === currentPage ? (
            <span key={it} className={activeCls} aria-current="page">{it}</span>
          ) : (
            <Link key={it} href={pageHref(filters, it)} className={linkCls}>{it}</Link>
          ),
        )}

        {currentPage < totalPages ? (
          <Link href={pageHref(filters, currentPage + 1)} className={linkCls} rel="next" aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className={disabledCls} aria-hidden><ChevronRight className="w-4 h-4" /></span>
        )}
      </div>
      <p className="text-xs text-ink-muted">
        Page {currentPage} of {totalPages} · {totalCount.toLocaleString()} listings
      </p>
    </nav>
  )
}
