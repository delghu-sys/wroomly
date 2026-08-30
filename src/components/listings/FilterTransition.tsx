'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

/**
 * Shared pending state for the browse filters.
 *
 * Every filter control pushes to the URL, and the results are rendered on the
 * server — so between the click and the new HTML there is a round trip during
 * which nothing on screen changed. Without a transition React blocks on that
 * navigation: the checkbox you clicked doesn't even tick until the server
 * answers, which reads as a dropped click and makes people click again.
 *
 * Wrapping the push in startTransition fixes both halves. The control updates
 * immediately, and `isPending` gives us somewhere to say "results are on the
 * way" — which has to be on the *results*, not on the control, because the
 * grid is what the user is waiting for.
 *
 * The provider owns one transition for all the controls so the whole filter
 * surface shares a single pending state, rather than each control lighting up
 * on its own while the others look idle.
 */

interface NavigateOptions {
  scroll?: boolean
  /** Swap the history entry instead of pushing one. The view toggle uses this
      so grid<->map doesn't fill the back button with dead states. */
  replace?: boolean
}

interface FilterNavigation {
  isPending: boolean
  navigate: (url: string, opts?: NavigateOptions) => void
}

const FilterTransitionContext = createContext<FilterNavigation | null>(null)

export function FilterTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (url: string, opts?: NavigateOptions) => {
      const { replace, ...navOpts } = opts ?? {}
      startTransition(() => {
        if (replace) router.replace(url, navOpts)
        else router.push(url, navOpts)
      })
    },
    [router],
  )

  const value = useMemo(() => ({ isPending, navigate }), [isPending, navigate])

  return (
    <FilterTransitionContext.Provider value={value}>
      {children}
    </FilterTransitionContext.Provider>
  )
}

/**
 * Filter controls call this instead of useRouter().push directly.
 *
 * Falls back to its own local transition when there's no provider, so a
 * control stays usable if it's ever rendered outside the browse page — it
 * loses the shared pending state, not its behaviour.
 */
export function useFilterNavigation(): FilterNavigation {
  const ctx = useContext(FilterTransitionContext)
  const router = useRouter()
  const [localPending, startLocal] = useTransition()

  const localNavigate = useCallback(
    (url: string, opts?: NavigateOptions) => {
      const { replace, ...navOpts } = opts ?? {}
      startLocal(() => {
        if (replace) router.replace(url, navOpts)
        else router.push(url, navOpts)
      })
    },
    [router],
  )

  const fallback = useMemo(
    () => ({ isPending: localPending, navigate: localNavigate }),
    [localPending, localNavigate],
  )

  return ctx ?? fallback
}

/**
 * Wraps the results column. Fades and un-clicks the stale results while the
 * next set is in flight, so the page reads as "working" rather than "broken".
 *
 * Deliberately keeps the old results on screen rather than swapping in a
 * skeleton: the previous set is still the best answer we have until the new
 * one lands, and blanking it makes the page flash on every checkbox.
 */
export function PendingResults({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const { isPending } = useFilterNavigation()

  return (
    <div
      aria-busy={isPending}
      className={`transition-opacity duration-200 ${
        isPending ? 'opacity-45 pointer-events-none' : 'opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Screen-reader announcement + the visible spinner slot next to the result
 * count. Separate from PendingResults because it must NOT be inside the
 * dimmed, pointer-events-none region.
 */
export function PendingIndicator({ className = '' }: { className?: string }) {
  const { isPending } = useFilterNavigation()

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition-opacity duration-200 ${
        isPending ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      <span
        aria-hidden
        className="w-3 h-3 rounded-full border-[1.5px] border-line border-t-navy animate-spin"
      />
      {isPending ? 'Updating results…' : ''}
    </span>
  )
}
