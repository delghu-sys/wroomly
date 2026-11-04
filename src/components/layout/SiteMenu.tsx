'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { MenuSection } from '@/lib/nav/site-menu'

interface SiteMenuProps {
  open: boolean
  sections: MenuSection[]
  onClose: () => void
  /** Present when signed in: a Sign out button closes the account column. */
  onSignOut?: () => void
}

/**
 * The site menu behind "☰ Menu" (and the phone hamburger): every part of the
 * site in four columns on a wide screen. On a phone it is just the four
 * categories; tapping one opens its links (one at a time), so the first thing
 * you see is four rows, not thirty links. It overlays the page rather than
 * pushing it down, and does NOT lock scrolling (a scroll lock
 * is what made the profile menu jump the page to the top).
 *
 * Closes on a link, on Escape (focus goes back to whatever opened it), and on a
 * click outside. The Navbar closes it on navigation too.
 */
export function SiteMenu({ open, ...rest }: SiteMenuProps) {
  // Mounted only while open, so every opening starts with all categories closed.
  return open ? <SiteMenuPanel {...rest} /> : null
}

function SiteMenuPanel({ sections, onClose, onSignOut }: Omit<SiteMenuProps, 'open'>) {
  const opener = useRef<Element | null>(null)
  // Phone only: which category is open. Wide screens always show everything.
  const [openSection, setOpenSection] = useState<string | null>(null)

  useEffect(() => {
    opener.current = document.activeElement
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      onClose()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Outside-click catcher, below the header. Transparent on purpose. */}
      <div className="fixed inset-x-0 top-16 bottom-0 z-40" aria-hidden onClick={onClose} />
      <nav
        id="site-menu"
        aria-label="Site menu"
        className="absolute inset-x-0 top-full z-50 border-t border-b border-line bg-background shadow-soft animate-fade-up max-h-[calc(100dvh-4rem)] overflow-y-auto"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-0 md:gap-y-6">
          {sections.map((section, idx) => {
            const isOpen = openSection === section.title
            const panelId = `site-menu-section-${idx}`
            const unread = section.links.reduce((n, l) => n + (l.badge ?? 0), 0)
            return (
              <div key={section.title} className="border-b border-line md:border-0 last:border-b-0">
                {/* Phone: the category is a row you tap to open. */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenSection(isOpen ? null : section.title)}
                  className="md:hidden w-full flex items-center justify-between gap-3 px-3 py-4 text-left"
                >
                  <span className="flex items-center gap-2 text-[17px] font-display font-medium tracking-tight text-ink">
                    {section.title}
                    {unread > 0 && (
                      <span className="text-[11px] bg-maize text-navy px-1.5 py-0.5 rounded-full font-semibold tabular-nums">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {/* Wide screens: the category is a small label above its links. */}
                <p className="hidden md:block px-3 text-[11px] uppercase tracking-[0.18em] text-gold-deep font-semibold mb-2">{section.title}</p>
                <ul id={panelId} className={`space-y-0.5 pb-3 md:pb-0 ${isOpen ? 'block' : 'hidden'} md:block`}>
                  {section.links.map(link => {
                    const inner = (
                      <>
                        <span className="flex items-center gap-2 text-[15px] font-medium text-ink">
                          {link.label}
                          {link.badge ? (
                            <span className="text-[11px] bg-maize text-navy px-1.5 py-0.5 rounded-full font-semibold tabular-nums">{link.badge > 9 ? '9+' : link.badge}</span>
                          ) : null}
                        </span>
                        {link.hint && <span className="hidden md:block text-[12.5px] text-ink-muted leading-snug mt-0.5">{link.hint}</span>}
                      </>
                    )
                    const cls = 'block rounded-xl px-3 py-2 hover:bg-navy-soft focus-visible:bg-navy-soft focus-visible:outline-none transition-colors'
                    return (
                      <li key={link.href + link.label}>
                        {link.external ? (
                          <a href={link.href} onClick={onClose} className={cls}>{inner}</a>
                        ) : (
                          <Link href={link.href} onClick={onClose} className={cls}>{inner}</Link>
                        )}
                      </li>
                    )
                  })}
                  {onSignOut && section.title === 'Your account' && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onSignOut()
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-[15px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>
    </>
  )
}
