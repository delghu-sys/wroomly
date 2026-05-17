'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CaretDown } from '@phosphor-icons/react/dist/ssr'

export interface TocEntry {
  id: string
  n: string
  title: string
}

interface TermsTOCProps {
  entries: TocEntry[]
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export function TermsTOC({ entries }: TermsTOCProps) {
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const ratiosRef = useRef<Map<string, number>>(new Map())

  // Scroll-spy with IntersectionObserver — track each section's visible ratio
  useEffect(() => {
    const elements = entries
      .map(e => document.getElementById(e.id))
      .filter((el): el is HTMLElement => Boolean(el))

    function recompute() {
      let bestId = entries[0]?.id ?? ''
      let bestRatio = -1
      for (const e of entries) {
        const r = ratiosRef.current.get(e.id) ?? 0
        if (r > bestRatio) {
          bestRatio = r
          bestId = e.id
        }
      }
      setActiveId(prev => (prev === bestId ? prev : bestId))
    }

    const io = new IntersectionObserver(
      entriesObs => {
        for (const o of entriesObs) {
          ratiosRef.current.set(o.target.id, o.intersectionRatio)
        }
        recompute()
      },
      {
        rootMargin: '-15% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    for (const el of elements) io.observe(el)
    return () => io.disconnect()
  }, [entries])

  function jumpTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    setMobileOpen(false)
    const top = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top, behavior: 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  const activeEntry = entries.find(e => e.id === activeId) ?? entries[0]

  return (
    <>
      {/* ── Desktop: sticky sidebar ── */}
      <nav className="hidden lg:block sticky top-24 self-start max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-3 pl-3">
          On this page
        </p>
        <ul className="relative space-y-0.5">
          {entries.map(e => {
            const isActive = e.id === activeId
            return (
              <li key={e.id} className="relative">
                <button
                  type="button"
                  onClick={() => jumpTo(e.id)}
                  className={`
                    relative w-full text-left pl-3 pr-3 py-2 rounded-xl
                    flex items-baseline gap-2
                    transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isActive ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'}
                  `}
                >
                  {isActive && (
                    <motion.span
                      layoutId="terms-toc-indicator"
                      transition={spring}
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full"
                      style={{ background: 'oklch(0.84 0.17 85)' }}
                      aria-hidden
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="terms-toc-bg"
                      transition={spring}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ background: 'oklch(0.84 0.17 85 / 0.06)' }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`
                      relative text-[10.5px] tabular-nums font-semibold shrink-0
                      ${isActive ? 'text-[oklch(0.45_0.13_85)]' : 'text-ink-muted/70'}
                    `}
                  >
                    §{e.n}
                  </span>
                  <span className="relative text-[13px] leading-snug font-medium line-clamp-2">
                    {e.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Mobile: dropdown ── */}
      <div className="lg:hidden sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3 bg-[oklch(0.985_0.006_85)]/85 backdrop-blur-xl border-b border-line">
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="
            relative w-full h-11 px-4 rounded-2xl
            inline-flex items-center justify-between gap-2
            bg-white border border-line text-ink
            text-[13px] font-medium tracking-tight
            shadow-[0_1px_2px_oklch(0_0_0/0.04)]
            transition-colors duration-300
            active:scale-[0.99]
          "
          aria-expanded={mobileOpen}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] tabular-nums font-semibold"
              style={{ color: 'oklch(0.45 0.13 85)' }}
            >
              §{activeEntry?.n}
            </span>
            <span className="truncate">{activeEntry?.title}</span>
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-ink-muted shrink-0 transition-transform duration-300 ${
              mobileOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-[oklch(0.10_0.02_260/0.40)] backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="
                  absolute left-4 right-4 sm:left-6 sm:right-6 top-full mt-2 z-50
                  rounded-2xl border border-line bg-white shadow-[0_18px_50px_oklch(0_0_0/0.12)]
                  max-h-[60vh] overflow-y-auto p-1.5
                "
              >
                {entries.map(e => {
                  const isActive = e.id === activeId
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => jumpTo(e.id)}
                      className={`
                        relative w-full text-left px-3 py-2.5 rounded-xl
                        flex items-baseline gap-2
                        transition-colors duration-200
                        ${
                          isActive
                            ? 'bg-[oklch(0.84_0.17_85/0.10)] text-ink'
                            : 'text-ink-soft hover:bg-[oklch(0.97_0.008_75)]'
                        }
                      `}
                    >
                      <span
                        className={`text-[10.5px] tabular-nums font-semibold shrink-0 ${
                          isActive ? 'text-[oklch(0.45_0.13_85)]' : 'text-ink-muted/70'
                        }`}
                      >
                        §{e.n}
                      </span>
                      <span className="text-[13px] leading-snug font-medium">
                        {e.title}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
