'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Search, FileText, Send, Loader2 } from 'lucide-react'
import type { DiscoverResult, DraftResult, OutreachResult } from '@/lib/agents/runner'

type Action = 'discover' | 'draft' | 'outreach'
type AnyResult = DiscoverResult | DraftResult | OutreachResult

interface Props {
  sources: { key: string; label: string; contactBasis: string }[]
}

/**
 * The three agents as buttons. "Preview" is a dry run (execute:false) and
 * changes nothing; "Run" executes. Everything goes through /api/admin/agents,
 * which re-verifies the admin server-side — the browser carries no trust, and
 * the runner still refuses to email anyone unless OUTREACH_ENABLED=true.
 */
export function AgentsConsole({ sources }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(sources.map(s => s.key))
  const [busy, setBusy] = useState<string | null>(null)
  const [results, setResults] = useState<Partial<Record<Action, AnyResult>>>({})

  async function run(action: Action, execute: boolean) {
    if (action === 'outreach' && execute) {
      const ok = window.confirm(
        'Send real emails to everyone on the plan? Each person is emailed once, ever, and can opt out.',
      )
      if (!ok) return
    }
    setBusy(`${action}:${execute}`)
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, execute, sources: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Run failed.')
        return
      }
      setResults(r => ({ ...r, [action]: data }))
      if (execute) {
        toast.success(`${action} finished.`)
        router.refresh()
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const steps: { action: Action; icon: typeof Search; title: string; desc: string; runLabel: string }[] = [
    { action: 'discover', icon: Search, title: '1. Discover', desc: 'Read the enabled boards and record new sublet posts. Never publishes anything.', runLabel: 'Run discovery' },
    { action: 'draft', icon: FileText, title: '2. Draft', desc: 'Turn leads that have a contact into pending, claimable drafts. Still unpublished.', runLabel: 'Create drafts' },
    { action: 'outreach', icon: Send, title: '3. Outreach', desc: 'Email each person once about their draft, under the daily cap, with one-click opt-out.', runLabel: 'Send emails' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {steps.map(({ action, icon: Icon, title, desc, runLabel }) => {
        const result = results[action]
        return (
          <div key={action} className="bg-surface border border-line rounded-3xl p-6 shadow-1 flex flex-col">
            <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h2 className="font-display text-lg tracking-tight text-ink">{title}</h2>
            <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1.5 flex-1">{desc}</p>

            {action === 'discover' && (
              <div className="mt-4 space-y-2">
                {sources.map(s => (
                  <label key={s.key} className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-navy-deep"
                      checked={selected.includes(s.key)}
                      onChange={e =>
                        setSelected(sel => (e.target.checked ? [...sel, s.key] : sel.filter(k => k !== s.key)))
                      }
                    />
                    <span>
                      <span className="font-medium text-ink">{s.label}</span>
                      <span className="block text-[12px] text-ink-muted leading-snug mt-0.5">{s.contactBasis}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null || (action === 'discover' && selected.length === 0)}
                onClick={() => run(action, false)}
              >
                {busy === `${action}:false` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Preview'}
              </Button>
              <Button
                size="sm"
                disabled={busy !== null || (action === 'discover' && selected.length === 0)}
                onClick={() => run(action, true)}
              >
                {busy === `${action}:true` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : runLabel}
              </Button>
            </div>

            {result && <ResultPanel action={action} result={result} />}
          </div>
        )
      })}
    </div>
  )
}

function ResultPanel({ action, result }: { action: Action; result: AnyResult }) {
  const label = result.execute ? 'Last run' : 'Preview'
  return (
    <div className="mt-4 rounded-2xl bg-navy-soft/40 border border-line px-4 py-3 text-[13px] text-ink-soft space-y-1">
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold">{label}</p>
      {action === 'discover' &&
        (result as DiscoverResult).sources.map(s => (
          <div key={s.key}>
            <p>
              <span className="font-medium text-ink">{s.label}:</span> {s.found} found, {s.withContact} with a contact
              {result.execute && <>, <span className="font-medium text-ink">{s.inserted} new</span></>}
            </p>
            {s.error && <p className="text-red-600">Error: {s.error}</p>}
            {s.rejected.length > 0 && <p className="text-ink-muted">{s.rejected.length} rejected by sanitizer</p>}
          </div>
        ))}
      {action === 'draft' && (
        <>
          <p>{(result as DraftResult).candidates} lead(s) with a contact and no draft yet</p>
          <p>
            <span className="font-medium text-ink">
              {result.execute ? 'Drafted' : 'Would draft'}: {(result as DraftResult).drafted}
            </span>
            {(result as DraftResult).skippedSuppressed > 0 && <> · {(result as DraftResult).skippedSuppressed} opted out</>}
          </p>
        </>
      )}
      {action === 'outreach' && (() => {
        const r = result as OutreachResult
        return (
          <>
            <p>
              Cap {r.dailyCap}/day · {r.sentInLastDay} sent in last 24h ·{' '}
              <span className="font-medium text-ink">{r.planned} planned</span>
              {r.execute && r.enabled && <> · <span className="font-medium text-ink">{r.sent} sent</span></>}
            </p>
            {Object.entries(r.skipped).map(([reason, n]) => (
              <p key={reason} className="text-ink-muted">skipped {n} — {reason}</p>
            ))}
            {r.execute && !r.enabled && (
              <p className="text-red-600">Nothing sent: OUTREACH_ENABLED is not &ldquo;true&rdquo; in the server environment.</p>
            )}
          </>
        )
      })()}
      {(result as { errors?: string[] }).errors?.map((e, i) => (
        <p key={i} className="text-red-600">{e}</p>
      ))}
    </div>
  )
}
