'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SaveSearchButtonProps {
  /** Current URL search-param map (same shape as the browse page reads). */
  currentFilters: Record<string, string | undefined>
  /** Authed flag — when false, button prompts sign-in instead. */
  authed: boolean
}

const NON_FILTER_KEYS = new Set(['sort', 'view'])

/**
 * "Save this search" pill — POSTs the current filter combo to
 * /api/saved-searches. Strips sort/view (those are UI prefs, not
 * search criteria). Toasts on success with a link to /saved-searches.
 *
 * Auto-disables when no real filters are set — saving an empty search
 * is useless and just creates noise in the user's list.
 */
export function SaveSearchButton({ currentFilters, authed }: SaveSearchButtonProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Strip empty + UI-only keys before checking if there's anything
  // meaningful to save.
  const meaningfulFilters = Object.fromEntries(
    Object.entries(currentFilters).filter(
      ([k, v]) => v && !NON_FILTER_KEYS.has(k),
    ) as [string, string][],
  )
  const hasFilters = Object.keys(meaningfulFilters).length > 0

  async function save() {
    if (saving) return
    if (!authed) {
      router.push('/sign-in?next=/listings')
      return
    }
    if (!hasFilters) {
      toast.error('Set at least one filter before saving.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: meaningfulFilters,
          email_alerts: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save search.')
        return
      }
      setSaved(true)
      toast.success('Search saved. We’ll email you when matches post.', {
        action: {
          label: 'Manage',
          onClick: () => router.push('/saved-searches'),
        },
      })
      // Reset the "saved" visual after a moment so the button is
      // reusable if the user tweaks filters and wants to re-save.
      setTimeout(() => setSaved(false), 2400)
    } catch (err) {
      console.error('[SaveSearchButton] save threw', err)
      toast.error('Could not save search. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={saving || (!hasFilters && authed)}
      className={`
        inline-flex items-center gap-1.5
        h-9 px-3.5 rounded-full text-[13px] font-medium
        transition-all duration-200 ease-out active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          saved
            ? 'bg-[oklch(0.55_0.15_142)] text-white shadow-[0_4px_14px_oklch(0.55_0.15_142/0.30)]'
            : 'bg-white/85 backdrop-blur border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.45)] hover:text-ink'
        }
      `}
      aria-label="Save this search"
    >
      {saving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : saved ? (
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : (
        <Bookmark
          className={`w-3.5 h-3.5 ${
            !hasFilters && authed ? 'text-ink-muted/50' : 'text-ink-muted'
          }`}
          strokeWidth={2}
        />
      )}
      {saved ? 'Saved' : 'Save search'}
    </button>
  )
}
