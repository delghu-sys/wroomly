'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Trap keyboard focus inside the returned ref while `active` is true.
 *
 * On activation:
 *   • Remembers the element that had focus.
 *   • Moves focus to the first focusable child inside the container.
 *   • Wraps Tab / Shift+Tab so it cycles within the container.
 *
 * On deactivation:
 *   • Restores focus to whatever held it before opening.
 *
 * This is what dialogs / modals / lightboxes need to be screen-reader and
 * keyboard accessible. Without it, Tab walks out of the dialog into the
 * page beneath and the user is silently lost.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Defer one tick so the modal has actually rendered when we look for
    // focusables (matters when the same render that opens the modal also
    // mounts its contents).
    const raf = requestAnimationFrame(() => {
      const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE)
      const first = focusables[0]
      if (first) first.focus()
      else node.focus() // fall back to container if it has tabIndex
    })

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = Array.from(
        node!.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(el => !el.hasAttribute('inert') && el.offsetParent !== null)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (activeEl === first || !node!.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      // Restore focus to whatever opened the dialog so screen readers
      // don't jump to <body>.
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}
