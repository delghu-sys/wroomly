'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Clock, Inbox as InboxIcon, Loader2, Mail, Save, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { InboxMessage } from '@/lib/universities/replies-runner'

interface Props {
  ready: boolean
  needsYou: InboxMessage[]
  done: InboxMessage[]
  fromDisplay: string
  replyTo: string
  enabled: boolean
  senderProblem: string | null
  automatic: { replyToIsInbound: boolean; notifyTo: string | null; lastAt: string | null }
}

const KIND_LABEL: Record<InboxMessage['kind'], string> = { human_reply: 'Reply', auto_reply: 'Auto-reply', opt_out: 'Asked us to stop', bounce: 'Bounce' }
const KIND_TONE: Record<InboxMessage['kind'], string> = {
  human_reply: 'text-[oklch(0.40_0.13_250)] border-[oklch(0.85_0.08_250)] bg-[oklch(0.97_0.03_250)]',
  auto_reply: 'text-ink-muted border-line bg-surface',
  opt_out: 'text-red-700 border-red-200 bg-red-50',
  bounce: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
}
const utc = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

async function post(body: object): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch('/api/admin/universities/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

/**
 * Everything universities wrote back, and what to do about it.
 * Automatic messages (out-of-office, bounces, "please stop") are handled for
 * you and listed below; only real replies wait here. For each, the assistant
 * has read it, prepared an answer, and suggested when to send it — you read it,
 * approve the exact text, and send.
 */
export function InboxPanel({ ready, needsYou, done, fromDisplay, replyTo, enabled, senderProblem, automatic }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  if (!ready) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-6 text-[14px] text-ink-soft leading-relaxed">
        <p className="font-medium text-ink mb-1">Migration 047 hasn&rsquo;t been applied yet.</p>
        <p>Paste <code className="font-mono text-[13px]">supabase/migrations/047_university_messages.sql</code> into the Supabase SQL editor to turn on the replies inbox.</p>
      </div>
    )
  }

  const unprepared = needsYou.filter(m => m.kind === 'human_reply' && m.status === 'new').length

  async function run(key: string, body: object, ok: (d: Record<string, unknown>) => string) {
    setBusy(key)
    try {
      const { ok: good, data } = await post(body)
      if (!good) { toast.error(String(data.message ?? data.error ?? 'Failed.')); return }
      toast.success(ok(data))
      router.refresh()
    } catch { toast.error('Network error. Please try again.') } finally { setBusy(null) }
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0"><InboxIcon className="w-5 h-5" strokeWidth={1.75} /></div>
        <div className="flex-1">
          <h2 className="font-display text-lg tracking-tight text-ink">Replies</h2>
          <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1 max-w-2xl">
            What universities wrote back. Out-of-office replies, bounces and &ldquo;please stop&rdquo; requests are handled automatically (a request to stop suppresses the address at once). Real replies wait here with a prepared answer and the best time to send it — you approve the exact text.
          </p>
        </div>
        {unprepared > 0 && (
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run('draft-all', { action: 'draft-all' }, d => `Prepared ${d.drafted}.${Number(d.remaining) ? ` ${d.remaining} more — click again.` : ''}`)}>
            {busy === 'draft-all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles data-icon="inline-start" />} Prepare {unprepared} repl{unprepared === 1 ? 'y' : 'ies'}
          </Button>
        )}
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${automatic.replyToIsInbound ? 'border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)] text-ink' : 'border-line bg-navy-soft/30 text-ink-soft'}`}>
        {automatic.replyToIsInbound ? (
          <>
            <strong>Automatic inbox is on.</strong> Replies to your emails arrive here by themselves, are read, and get a prepared answer.{' '}
            {automatic.lastAt ? <>Last one arrived {utc(automatic.lastAt)}.</> : <>None has arrived yet.</>}{' '}
            {automatic.notifyTo ? <>You are told at <strong>{automatic.notifyTo}</strong>.</> : <span className="text-red-600">No notification address is set — set &ldquo;Notify me at&rdquo; below, or new replies will arrive unnoticed.</span>}
          </>
        ) : (
          <>
            <strong>Automatic inbox is off.</strong> Replies currently go to <strong>{replyTo || 'your Reply-to address'}</strong>, an inbox I only see when asked to sync it. To have them arrive here by themselves, set Reply-to (below) to an address on <code className="font-mono text-[12px]">replies.wroomly.app</code> once that subdomain is verified in Resend — see the setup steps in docs/university-outreach.md.
          </>
        )}
      </div>

      {needsYou.length === 0 ? (
        <p className="text-[13.5px] text-ink-muted mt-5">Nothing waiting for you. New replies appear here once they are synced from your inbox.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {needsYou.map(m => (
            <Card key={m.id} m={m} fromDisplay={fromDisplay} replyTo={replyTo} enabled={enabled} senderProblem={senderProblem} busy={busy} run={run} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="mt-6 group">
          <summary className="cursor-pointer text-[13px] text-ink-muted hover:text-ink select-none">Handled ({done.length}) — automatic messages and finished conversations</summary>
          <ul className="mt-3 divide-y divide-line/60 text-[13px]">
            {done.map(m => (
              <li key={m.id} className="py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${KIND_TONE[m.kind]}`}>{KIND_LABEL[m.kind]}</span>
                <span className="text-ink">{m.prospectId ? <Link href={`/admin/universities/${m.prospectId}`} className="text-navy underline underline-offset-2 hover:text-ink">{m.university}</Link> : m.fromEmail}</span>
                <span className="text-ink-muted tabular-nums">{utc(m.receivedAt)}</span>
                <span className="text-ink-muted">
                  {m.kind === 'auto_reply' && m.holdFollowupUntil ? `no follow-up before ${m.holdFollowupUntil.slice(0, 10)}` : null}
                  {m.kind === 'opt_out' ? `${m.kindReason ?? ''} — suppressed` : null}
                  {m.replySent ? `answered ${m.replySent.sentAt.slice(0, 10)}` : null}
                  {m.status === 'ignored' ? 'ignored' : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Card({ m, fromDisplay, replyTo, enabled, senderProblem, busy, run }: {
  m: InboxMessage
  fromDisplay: string
  replyTo: string
  enabled: boolean
  senderProblem: string | null
  busy: string | null
  run: (key: string, body: object, ok: (d: Record<string, unknown>) => string) => Promise<void>
}) {
  const [subject, setSubject] = useState(m.suggestedSubject ?? '')
  const [body, setBody] = useState(m.suggestedBody ?? '')
  const dirty = subject !== (m.suggestedSubject ?? '') || body !== (m.suggestedBody ?? '')
  const hasDraft = !!m.suggestedBody?.trim()
  const b = (k: string) => busy === `${k}:${m.id}`

  function sendNow() {
    const ok = window.confirm(`Send this answer to ${m.fromEmail}?\n\nFrom: ${fromDisplay}\nReplies go to: ${replyTo}\nSubject: ${m.suggestedSubject}\n\nIt goes in the same email thread. This cannot be undone.`)
    if (ok) void run(`send:${m.id}`, { action: 'send', id: m.id, confirm: true }, () => `Answer sent to ${m.fromEmail}.`)
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[oklch(0.40_0.13_250)] border-[oklch(0.85_0.08_250)] bg-[oklch(0.97_0.03_250)]">Reply</span>
        <span className="text-[15px] text-ink font-medium">{m.prospectId ? <Link href={`/admin/universities/${m.prospectId}`} className="text-navy underline underline-offset-2 hover:text-ink">{m.university}</Link> : 'Unknown sender'}</span>
        <span className="text-[13px] text-ink-muted">{m.fromName ? `${m.fromName} · ` : ''}{m.fromEmail}</span>
        <span className="text-[12px] text-ink-muted tabular-nums ml-auto">{utc(m.receivedAt)}</span>
      </div>
      {!m.prospectId && <p className="text-[12.5px] text-[oklch(0.50_0.15_75)] mt-1">Couldn&rsquo;t match this sender to one university — check who it is before answering.</p>}

      {m.summary ? (
        <p className="text-[14px] text-ink mt-3 whitespace-pre-wrap leading-relaxed">{m.summary}</p>
      ) : (
        <p className="text-[13.5px] text-ink-muted mt-3">Not read yet. Click <strong>Prepare a reply</strong> and the assistant will summarise it and draft an answer.</p>
      )}
      {m.intent && <p className="text-[12px] text-ink-muted mt-1">Looks like: {m.intent}{m.language ? ` · written in ${m.language}` : ''}</p>}

      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] text-ink-muted hover:text-ink select-none">What they wrote</summary>
        <p className="text-[12px] text-ink-muted mt-2">Subject: {m.subject ?? '(none)'}</p>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-soft max-h-72 overflow-auto rounded-xl bg-navy-soft/30 p-3">{m.body.slice(0, 6000)}</pre>
      </details>

      {!hasDraft && m.status !== 'approved' ? (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(`draft:${m.id}`, { action: 'draft', id: m.id }, () => 'Reply prepared.')}>
            {b('draft') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles data-icon="inline-start" />} {m.status === 'drafted' ? 'Prepare again' : 'Prepare a reply'}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`mark:${m.id}`, { action: 'mark', id: m.id, status: 'handled' }, () => 'Marked handled.')}>Mark handled</Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`mark:${m.id}`, { action: 'mark', id: m.id, status: 'ignored' }, () => 'Ignored.')}>Ignore</Button>
          {m.status === 'drafted' && <span className="text-[12.5px] text-ink-muted">The assistant suggests no reply.</span>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {m.suggestedSendNote && (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft"><Clock className="w-3.5 h-3.5" /> Best time: {m.suggestedSendNote}</p>
          )}
          <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1 text-[13.5px]">
            <dt className="text-ink-muted">From</dt><dd className="text-ink font-medium">{fromDisplay}</dd>
            <dt className="text-ink-muted">To</dt><dd className="text-ink">{m.fromEmail}</dd>
            <dt className="text-ink-muted">Reply-to</dt><dd className={replyTo ? 'text-ink' : 'text-red-600'}>{replyTo || 'not set'}</dd>
          </dl>
          <Input aria-label="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea aria-label="Reply" rows={9} value={body} onChange={e => setBody(e.target.value)} className="text-[13.5px] leading-relaxed" />
          {senderProblem && <p className="text-[12.5px] text-red-600">{senderProblem}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null || !dirty} onClick={() => run(`save:${m.id}`, { action: 'save', id: m.id, subject, body }, () => 'Saved.')}>
              {b('save') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save data-icon="inline-start" />} Save
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null || dirty} onClick={() => run(`test:${m.id}`, { action: 'test', id: m.id }, d => `Test sent to ${d.sentTo}.`)}>
              {b('test') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail data-icon="inline-start" />} Send me a test
            </Button>
            {m.approvalCurrent ? (
              <>
                <span className="inline-flex items-center gap-1 text-[13px] text-[oklch(0.40_0.13_142)]"><Check className="w-4 h-4" /> Approved</span>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`withdraw:${m.id}`, { action: 'withdraw', id: m.id }, () => 'Approval withdrawn.')}>Withdraw approval</Button>
                <Button size="sm" disabled={busy !== null || !enabled} onClick={sendNow}>
                  {b('send') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send data-icon="inline-start" />} Send now
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={busy !== null || dirty || !!senderProblem || !hasDraft} onClick={() => run(`approve:${m.id}`, { action: 'approve', id: m.id }, () => 'Approved. Nothing was sent.')}>
                {b('approve') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} Approve this exact message
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`mark:${m.id}`, { action: 'mark', id: m.id, status: 'handled' }, () => 'Marked handled.')}>Mark handled</Button>
          </div>
          {dirty && <p className="text-[12.5px] text-ink-muted">Save your edits first — approving and testing use the saved text.</p>}
          {m.status === 'approved' && !m.approvalCurrent && <p className="text-[12.5px] text-red-600">The text, recipient or sender changed after you approved it. Approve it again.</p>}
          {m.approvalCurrent && !enabled && <p className="text-[12.5px] text-red-600">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}
        </div>
      )}
    </div>
  )
}
