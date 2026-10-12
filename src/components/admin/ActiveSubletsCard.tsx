'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActiveSummary } from '@/lib/agents/active-sublets'
import type { ActiveRefreshResult } from '@/lib/agents/runner'

interface Props {
  initial: ActiveSummary
}

function when(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * How many sublets are active on Off Campus Universe right now.
 *
 * "Active" means the board lists it as available AND its dates have not
 * expired. The number shown on load comes from stored data, so it costs
 * nothing; the button re-reads the board for the listings that could still be
 * active and updates it. The sitemap size is deliberately not used: it keeps
 * every listing ever posted.
 */
export function ActiveSubletsCard({ initial }: Props) {
  const [s, setS] = useState<ActiveSummary>(initial)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/agents/active-sublets', { method: 'POST' })
      const json = (await res.json().catch(() => ({}))) as Partial<ActiveRefreshResult> & { error?: string }
      if (!res.ok || !json.summary) {
        toast.error(json.error ?? 'Could not check the board.')
        return
      }
      setS(json.summary)
      const unseen = json.unseen ?? 0
      toast.success(
        unseen > 0
          ? `Checked. ${unseen} listing${unseen === 1 ? '' : 's'} on the site not yet looked at: run Discover.`
          : 'Checked against the site.',
      )
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const chips = [
    { n: s.confirmed, label: 'confirmed', hint: 'explicit end date still ahead' },
    { n: s.likely, label: 'likely', hint: 'no end date, posted recently' },
    { n: s.probablyStale, label: 'probably stale', hint: 'no end date, old post' },
  ]

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-1 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-lg tracking-tight text-ink">Active sublets on Off Campus Universe</h2>
            <p className="text-[13px] text-ink-muted mt-0.5">
              Listed as available on the board, and the dates have not expired.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={refresh} disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh from site
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
        <p className="font-display text-5xl tracking-tight text-ink tabular-nums leading-none">{s.active}</p>
        <ul className="flex flex-wrap gap-2">
          {chips.map(c => (
            <li
              key={c.label}
              title={c.hint}
              className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-navy-soft/30 px-3 py-1 text-[13px] text-ink-soft"
            >
              <span className="font-semibold text-ink tabular-nums">{c.n}</span> {c.label}
            </li>
          ))}
        </ul>
      </div>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-[13px]">
        <div>
          <dt className="text-ink-muted">Posted in last 30 days</dt>
          <dd className="font-medium text-ink tabular-nums">{s.postedLast30Days}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Already emailed</dt>
          <dd className="font-medium text-ink tabular-nums">
            {s.emailed} of {s.active}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Ready to email</dt>
          <dd className="font-medium text-ink tabular-nums">{s.readyToEmail}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Sublets ever seen</dt>
          <dd className="font-medium text-ink tabular-nums">
            {s.sublets}
            <span className="text-ink-muted font-normal"> ({s.expired} expired, {s.rented} rented)</span>
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[12px] text-ink-muted" suppressHydrationWarning>
        Last checked against the site: {when(s.lastCheckedAt)}.
        {s.statusUnchecked > 0 && (
          <span className="text-[oklch(0.55_0.18_25)]">
            {' '}
            {s.statusUnchecked} not checked yet, so counted as available. Refresh to confirm.
          </span>
        )}
      </p>
    </div>
  )
}
