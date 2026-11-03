'use client'

import { useEffect, useState } from 'react'

/** "In this guide": links to each section, with the one being read marked. */
export function GuideToc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const els = items.map(i => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -65% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [items])

  return (
    <nav aria-label="In this guide">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted font-semibold mb-3">In this guide</p>
      <ol className="space-y-1 border-l border-line">
        {items.map(i => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-1.5 pl-4 pr-2 text-[13.5px] leading-snug transition-colors ${
                active === i.id ? 'border-maize-bright text-ink font-medium' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
