'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CLAIM_PLACEHOLDER, type ManualState } from '@/lib/agents/manual-outreach'
import type { ManualItem } from '@/lib/agents/manual-runner'

const STATE_LABEL: Record<ManualState, string> = {
  waiting: 'Waiting',
  replied: 'Replied',
  listed: 'Listed',
  declined: 'Not interested',
  closed: 'Closed',
}
const STATE_TONE: Record<ManualState, string> = {
  waiting: 'text-ink-muted border-line bg-surface',
  replied: 'text-[oklch(0.45_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  listed: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
  declined: 'text-red-700 border-red-200 bg-red-50',
  closed: 'text-ink-muted border-line bg-surface',
}

const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Conversations started by hand on another site's messenger: what was sent,
 *  what came back, and the next message, prepared. A person sends it; this only
 *  records and prepares. */
export function ManualOutreachPanel({ items }: { items: ManualItem[] }) {
  const needAction = items.filter(i => i.next.due).length
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight text-ink mb-1">Messaged by hand</h2>
      <p className="text-[13.5px] text-ink-muted mb-4 max-w-2xl">
        Leads you contacted through another site&rsquo;s own messenger. Log what comes back; the next message is prepared for you to paste and send.{' '}
        <span className="text-ink font-medium">{needAction} need{needAction === 1 ? 's' : ''} action.</span>
      </p>
      <div className="space-y-3">
        {items.map(item => <ManualCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}

function ManualCard({ item }: { item: ManualItem }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [text, setText] = useState(item.next.text ?? '')
  const [reply, setReply] = useState('')
  const t = item.thread
  const hasPlaceholder = text.includes(CLAIM_PLACEHOLDER)

  async function call(action: string, extra: object = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/agents/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: item.id, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Failed.'); return { ok: false, data } }
      return { ok: true, data }
    } catch {
      toast.error('Network error. Please try again.')
      return { ok: false, data: {} }
    } finally {
      setBusy(null)
    }
  }

  async function fillLink() {
    const r = await call('claim-link')
    if (!r.ok) return
    setText(prev => prev.replace(CLAIM_PLACEHOLDER, String(r.data.url)))
    toast.success('Claim link added. It works for 7 days.')
    router.refresh()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied.')
    } catch {
      toast.error('Could not copy. Select the text and copy it.')
    }
  }

  async function markSent() {
    const kind = item.next.kind === 'follow-up' ? 'follow-up' : item.next.tone === 'positive' ? 'claim' : 'reply'
    const r = await call('log-sent', { text, kind })
    if (r.ok) { toast.success('Logged as sent.'); router.refresh() }
  }

  async function saveReply() {
    const r = await call('log-reply', { text: reply })
    if (r.ok) { setReply(''); toast.success('Reply saved.'); router.refresh() }
  }

  async function setState(state: ManualState) {
    const r = await call('set-state', { state })
    if (r.ok) { toast.success(`Marked ${STATE_LABEL[state].toLowerCase()}.`); router.refresh() }
  }

  const finished = t.state === 'listed' || t.state === 'declined' || t.state === 'closed'

  return (
    <div className={`rounded-3xl border bg-surface p-5 shadow-1 ${item.next.due ? 'border-[oklch(0.85_0.10_75)]' : 'border-line'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{item.title}</p>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            {[item.price, item.dates].filter(Boolean).join(' · ')}
            {item.sourceUrl && <> · <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">listing</a></>}
            {t.conversationUrl && <> · <a href={t.conversationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2">conversation <ExternalLink className="w-3 h-3" /></a></>}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${STATE_TONE[t.state]}`}>{STATE_LABEL[t.state]}</span>
      </div>

      <p className={`text-[13.5px] mt-2 ${item.next.due ? 'text-ink font-medium' : 'text-ink-muted'}`}>{item.next.reason}</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] text-ink-muted">Conversation ({t.messages.length})</summary>
        <ul className="mt-2 space-y-2">
          {t.messages.map((m, i) => (
            <li key={i} className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed max-w-[90%] ${m.dir === 'out' ? 'bg-navy-soft/60 text-ink ml-auto' : 'bg-white border border-line text-ink'}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className="text-[10.5px] text-ink-muted mt-1">{m.dir === 'out' ? `You${m.kind ? `, ${m.kind}` : ''}` : 'Them'} · {fmt(m.at)}</p>
            </li>
          ))}
        </ul>
      </details>

      {item.next.text && (
        <div className="mt-4">
          <label className="text-[12px] uppercase tracking-wide text-ink-muted font-semibold" htmlFor={`next-${item.id}`}>Next message, ready to paste</label>
          <textarea id={`next-${item.id}`} value={text} onChange={e => setText(e.target.value)} rows={5} className="mt-1.5 w-full rounded-2xl border border-line bg-background px-3 py-2 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy/20" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {hasPlaceholder && (
              <Button size="sm" disabled={busy !== null} onClick={fillLink}>
                {busy === 'claim-link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 data-icon="inline-start" />} Add claim link
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy !== null || hasPlaceholder} onClick={copy} title={hasPlaceholder ? 'Add the claim link first' : undefined}><Copy data-icon="inline-start" /> Copy</Button>
            <Button size="sm" variant="outline" disabled={busy !== null || hasPlaceholder} onClick={markSent} title={hasPlaceholder ? 'Add the claim link first' : 'Record that you sent this'}>
              {busy === 'log-sent' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} I sent this
            </Button>
          </div>
        </div>
      )}

      {!finished && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <label className="text-[12px] uppercase tracking-wide text-ink-muted font-semibold" htmlFor={`reply-${item.id}`}>They replied</label>
            <textarea id={`reply-${item.id}`} value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Paste what they wrote" className="mt-1.5 w-full rounded-2xl border border-line bg-background px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <Button size="sm" variant="outline" disabled={busy !== null || !reply.trim()} onClick={saveReply}>
            {busy === 'log-reply' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save reply'}
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!finished && (
          <>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setState('listed')}>Listed on Wroomly</Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setState('declined')}>Not interested</Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setState('closed')}>Close</Button>
          </>
        )}
        {finished && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setState('waiting')}>Reopen</Button>}
      </div>
    </div>
  )
}
