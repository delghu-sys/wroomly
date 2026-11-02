'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BellRing, Check, Loader2, Send, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Item {
  id: string
  name: string
  country: string | null
  sentAt: string
  daysSince: number
  due: boolean
  state: 'none' | 'drafted' | 'approved' | 'sent'
}

interface Props {
  ready: boolean
  items: Item[]
  due: number
  waiting: number
  minDays: number
  fromDisplay: string
  replyTo: string
  enabled: boolean
}

const STATE_TONE: Record<Item['state'], string> = {
  none: 'text-ink-muted border-line bg-surface',
  drafted: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  approved: 'text-[oklch(0.40_0.13_250)] border-[oklch(0.85_0.08_250)] bg-[oklch(0.97_0.03_250)]',
  sent: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
}
const STATE_LABEL: Record<Item['state'], string> = { none: 'no draft', drafted: 'drafted', approved: 'approved', sent: 'sent' }

/**
 * The follow-up reminder: everyone we have emailed who has not replied, with
 * when their follow-up is due. One follow-up each, ever, drafted for you and
 * approved by you like the first email. Nothing here sends by itself.
 */
export function FollowupsPanel({ ready, items, due, waiting, minDays, fromDisplay, replyTo, enabled }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  if (!ready) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-6 text-[14px] text-ink-soft leading-relaxed">
        <p className="font-medium text-ink mb-1">Migration 046 hasn&rsquo;t been applied yet.</p>
        <p>Paste <code className="font-mono text-[13px]">supabase/migrations/046_university_followups.sql</code> into the Supabase SQL editor to turn on follow-ups.</p>
      </div>
    )
  }

  const toDraft = items.filter(i => i.due && i.state === 'none')
  const drafted = items.filter(i => i.state === 'drafted')
  const approvedDue = items.filter(i => i.state === 'approved' && i.due)
  const tickable = (i: Item) => i.state === 'drafted' || i.state === 'approved'
  const chosen = items.filter(i => selected.has(i.id) && tickable(i))
  const chosenDrafted = chosen.filter(i => i.state === 'drafted').map(i => i.id)
  const chosenApproved = chosen.filter(i => i.state === 'approved').map(i => i.id)
  const nextIn = items.filter(i => !i.due).reduce<number | null>((m, i) => { const d = minDays - i.daysSince; return m === null || d < m ? d : m }, null)

  async function call(key: string, body: object, ok: (d: Record<string, number>) => string) {
    setBusy(key)
    try {
      const res = await fetch('/api/admin/universities/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? data.message ?? 'Failed.')
      toast.success(ok(data))
      if (key === 'send-approved' && data.remaining) toast.message('Click Send again to continue — each click sends for up to about 45 seconds.')
      if (key === 'send-approved') { const f = (data.outcomes ?? []).find((o: { sent: boolean }) => !o.sent); if (f) toast.error(`${f.name}: ${f.message}`) }
      setSelected(new Set())
      router.refresh()
    } catch { toast.error('Network error. Please try again.') } finally { setBusy(null) }
  }

  function approve() {
    const ids = chosenDrafted.length ? chosenDrafted : undefined
    void call('approve', { action: 'approve', ...(ids ? { ids } : {}) }, d => `Approved ${d.approved}. Nothing was sent.`)
  }
  function sendAll() {
    const ok = window.confirm(`Send ${approvedDue.length} approved follow-up${approvedDue.length === 1 ? '' : 's'}?\n\nFrom: ${fromDisplay}\nReplies go to: ${replyTo || '(not set)'}\n\nThere is only ever one follow-up per university. This cannot be undone.`)
    if (ok) void call('send-approved', { action: 'send-approved', confirm: true }, d => `Sent ${d.sent}.${d.remaining ? ` ${d.remaining} still waiting.` : ''}`)
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0"><BellRing className="w-5 h-5" strokeWidth={1.75} /></div>
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">Follow-ups</h2>
          <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1 max-w-2xl">
            A follow-up becomes due {minDays} days after the first email, if the university hasn&rsquo;t replied. One each, ever. It is drafted for you, and you approve and send it just like the first email.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[13.5px] text-ink-muted mt-5">No emails sent yet. Follow-ups will appear here {minDays} days after the first one goes out.</p>
      ) : (
        <>
          <p className="text-[14px] text-ink mt-5">
            <strong className="tabular-nums">{due}</strong> due now · <span className="tabular-nums">{waiting}</span> waiting
            {nextIn !== null && nextIn > 0 && <span className="text-ink-muted"> (next in {nextIn} day{nextIn === 1 ? '' : 's'})</span>}
          </p>
          {!enabled && <p className="text-[12.5px] text-red-600 mt-2">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={busy !== null || toDraft.length === 0} onClick={() => call('draft', { action: 'draft' }, d => `Drafted ${d.drafted} follow-up${d.drafted === 1 ? '' : 's'}.`)}>
              {busy === 'draft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Draft {toDraft.length} follow-up{toDraft.length === 1 ? '' : 's'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null || (chosenDrafted.length === 0 && drafted.length === 0) || !replyTo} onClick={approve}>
              {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} {chosenDrafted.length ? `Approve ${chosenDrafted.length} selected` : `Approve all ${drafted.length} drafted`}
            </Button>
            {chosenApproved.length > 0 && (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call('withdraw', { action: 'withdraw', ids: chosenApproved }, d => `Withdrew approval from ${d.withdrawn}.`)}>
                <Undo2 data-icon="inline-start" /> Withdraw ({chosenApproved.length})
              </Button>
            )}
            <Button size="sm" disabled={busy !== null || approvedDue.length === 0} onClick={sendAll}>
              {busy === 'send-approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send data-icon="inline-start" />} Send {approvedDue.length} approved
            </Button>
          </div>

          <div className="overflow-auto max-h-[50vh] rounded-2xl border border-line mt-4">
            <table className="w-full text-left text-[13px] border-separate border-spacing-0">
              <thead className="sticky top-0 bg-navy-soft text-ink-muted text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 w-8"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">University</th>
                  <th className="px-3 py-2 font-medium">First email</th>
                  <th className="px-3 py-2 font-medium">Follow-up</th>
                  <th className="px-3 py-2 font-medium">Draft</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, n) => (
                  <tr key={i.id} className={n % 2 ? 'bg-navy-soft/20' : ''}>
                    <td className="px-3 py-2 border-t border-line/60">
                      <input type="checkbox" aria-label={`Select ${i.name} follow-up`} className="accent-navy-deep" disabled={!tickable(i)} checked={selected.has(i.id) && tickable(i)}
                        onChange={() => setSelected(prev => { const s = new Set(prev); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); return s })} />
                    </td>
                    <td className="px-3 py-2 border-t border-line/60"><Link href={`/admin/universities/${i.id}`} className="text-navy underline underline-offset-2 hover:text-ink">{i.name}</Link><span className="text-ink-muted"> {i.country ?? ''}</span></td>
                    <td className="px-3 py-2 border-t border-line/60 text-ink-muted tabular-nums whitespace-nowrap">{i.sentAt.slice(0, 10)} · {i.daysSince}d ago</td>
                    <td className={`px-3 py-2 border-t border-line/60 whitespace-nowrap ${i.due ? 'text-[oklch(0.40_0.13_142)] font-medium' : 'text-ink-muted'}`}>{i.due ? 'due now' : `in ${minDays - i.daysSince} day${minDays - i.daysSince === 1 ? '' : 's'}`}</td>
                    <td className="px-3 py-2 border-t border-line/60"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${STATE_TONE[i.state]}`}>{STATE_LABEL[i.state]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
