'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { SavedSearch } from '@/types/database'

interface SavedSearchRowProps {
  search: SavedSearch
}

const LABELS: Record<string, (v: string) => string> = {
  q: v => `"${v}"`,
  type: v => (v === 'sublet' ? 'Sublet' : 'Swap'),
  neighborhood: v => v,
  property_type: v => v.charAt(0).toUpperCase() + v.slice(1),
  residence_name: v => v,
  bedrooms: v => (v === '0' ? 'Studio' : `${v} bed`),
  furnished: () => 'Furnished',
  pets: () => 'Pets OK',
  min_price: v => `$${v}+`,
  max_price: v => `Under $${v}`,
  available_from: v => {
    try {
      return `From ${format(parseISO(v), 'MMM yyyy')}`
    } catch {
      return v
    }
  },
}

export function SavedSearchRow({ search }: SavedSearchRowProps) {
  const router = useRouter()
  const [alertsOn, setAlertsOn] = useState(search.email_alerts)
  const [busy, setBusy] = useState<'toggle' | 'delete' | null>(null)

  // Render the filter combo as human-readable pills.
  const filterPills = Object.entries(search.filters ?? {})
    .map(([k, v]) => ({
      key: k,
      label: LABELS[k]?.(v) ?? v,
    }))

  // Re-apply URL = /listings?<filters as query string>
  const browseUrl = `/listings?${new URLSearchParams(
    Object.entries(search.filters ?? {}).reduce((acc, [k, v]) => {
      acc[k] = String(v)
      return acc
    }, {} as Record<string, string>),
  ).toString()}`

  async function toggleAlerts() {
    if (busy) return
    setBusy('toggle')
    const next = !alertsOn
    setAlertsOn(next) // optimistic
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_alerts: next }),
      })
      if (!res.ok) throw new Error('update failed')
      toast.success(next ? 'Email alerts on' : 'Email alerts off')
    } catch {
      setAlertsOn(!next) // rollback
      toast.error('Could not update alerts')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (busy) return
    if (!confirm('Delete this saved search?')) return
    setBusy('delete')
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')
      toast.success('Saved search deleted')
      router.refresh()
    } catch {
      toast.error('Could not delete')
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-center">
      {/* Filter pills */}
      <div className="flex-1 min-w-0">
        {search.name ? (
          <p className="font-display text-base text-ink tracking-tight mb-2">
            {search.name}
          </p>
        ) : null}
        {filterPills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {filterPills.map(p => (
              <span
                key={p.key}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-white/85 border border-line text-ink-soft"
              >
                {p.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-muted italic">
            All listings — no filters applied
          </p>
        )}
        <p className="text-[11px] text-ink-muted mt-2">
          Saved {format(parseISO(search.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleAlerts}
          disabled={busy !== null}
          aria-pressed={alertsOn}
          className={`
            inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-medium
            transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-60
            ${
              alertsOn
                ? 'bg-[oklch(0.55_0.15_142/0.15)] text-[oklch(0.35_0.13_142)] border border-[oklch(0.55_0.15_142/0.40)]'
                : 'bg-white border border-line text-ink-muted hover:text-ink'
            }
          `}
        >
          {busy === 'toggle' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : alertsOn ? (
            <Bell className="w-3.5 h-3.5" strokeWidth={2} />
          ) : (
            <BellOff className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          {alertsOn ? 'Alerts on' : 'Alerts off'}
        </button>
        <Link
          href={browseUrl}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-medium bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.97]"
        >
          Browse <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          aria-label="Delete saved search"
          className="w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600 transition disabled:opacity-60"
        >
          {busy === 'delete' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  )
}
