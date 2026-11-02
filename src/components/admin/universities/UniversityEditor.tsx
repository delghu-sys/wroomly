'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Mail, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  id: string
  name: string
  status: string
  subject: string
  body: string
  contactEmail: string
  fromDisplay: string
  replyTo: string
  /** Approved AND nothing changed since. */
  approvalCurrent: boolean
  senderProblem: string | null
  sendingEnabled: boolean
  sent: { from: string; to: string; replyTo: string; subject: string; body: string; sentAt: string } | null
  replyNote: string
}

type Action = 'save' | 'approve' | 'unapprove' | 'test' | 'send' | 'outcome'

export function UniversityEditor(p: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState(p.subject)
  const [body, setBody] = useState(p.body)
  const [to, setTo] = useState(p.contactEmail)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState(p.replyNote)

  const locked = ['sent', 'replied', 'declined'].includes(p.status)
  const dirty = subject !== p.subject || body !== p.body || to !== p.contactEmail

  async function call(action: Action, extra: object = {}, label = action as string) {
    setBusy(label)
    try {
      const res = await fetch(`/api/admin/universities/${p.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.message ?? data.error ?? 'Failed.'); return false }
      if (action === 'test') toast.success(`Test sent to ${data.sentTo}. Check how it arrives — From: ${data.from}`)
      else if (action === 'send') toast.success(`Sent to ${p.name}.`)
      else toast.success('Done.')
      router.refresh()
      return true
    } catch { toast.error('Network error. Please try again.'); return false } finally { setBusy(null) }
  }

  const save = () => call('save', { subject, body, contact_email: to || null })

  function sendNow() {
    const ok = window.confirm(`Send this email to ${p.contactEmail}?\n\nFrom: ${p.fromDisplay}\nReplies go to: ${p.replyTo}\nSubject: ${p.subject}\n\nThis cannot be undone.`)
    if (ok) void call('send', { confirm: true })
  }

  if (p.sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold">Sent {p.sent.sentAt.slice(0, 16).replace('T', ' ')} UTC — exactly as it went out</p>
          <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-1 text-[13.5px]">
            <dt className="text-ink-muted">From</dt><dd className="text-ink">{p.sent.from}</dd>
            <dt className="text-ink-muted">To</dt><dd className="text-ink">{p.sent.to}</dd>
            <dt className="text-ink-muted">Reply-to</dt><dd className="text-ink">{p.sent.replyTo}</dd>
            <dt className="text-ink-muted">Subject</dt><dd className="text-ink">{p.sent.subject}</dd>
          </dl>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-soft border-t border-line pt-4">{p.sent.body}</pre>
        </div>
        <Outcome p={p} note={note} setNote={setNote} call={call} busy={busy} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-3">Envelope — what the recipient will see</p>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-y-2 text-[13.5px] items-center">
          <dt className="text-ink-muted">From</dt><dd className="text-ink font-medium">{p.fromDisplay}</dd>
          <dt className="text-ink-muted">Reply-to</dt><dd className={p.replyTo ? 'text-ink' : 'text-red-600'}>{p.replyTo || 'not set — set it in Sender and template'}</dd>
          <dt className="text-ink-muted"><Label htmlFor="to">To</Label></dt>
          <dd><Input id="to" type="email" value={to} onChange={e => setTo(e.target.value)} disabled={locked} className="max-w-sm" /></dd>
        </dl>
        {p.senderProblem && <p className="text-[12.5px] text-red-600 mt-3">{p.senderProblem}</p>}
        <div className="mt-5 space-y-3">
          <div className="space-y-1.5"><Label htmlFor="subject">Subject</Label><Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} disabled={locked} /></div>
          <div className="space-y-1.5"><Label htmlFor="body">Message</Label><Textarea id="body" rows={17} value={body} onChange={e => setBody(e.target.value)} disabled={locked} className="text-[13.5px] leading-relaxed" /></div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Button variant="outline" size="sm" disabled={busy !== null || locked || !dirty} onClick={save}>
            {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save data-icon="inline-start" />} Save
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null || dirty || !p.subject} onClick={() => call('test')} title="Mails this draft to your own address">
            {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail data-icon="inline-start" />} Send me a test
          </Button>
          {p.approvalCurrent ? (
            <>
              <span className="inline-flex items-center gap-1 text-[13px] text-[oklch(0.40_0.13_142)]"><Check className="w-4 h-4" /> Approved</span>
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => call('unapprove')}>Withdraw approval</Button>
              <Button size="sm" disabled={busy !== null || !p.sendingEnabled} onClick={sendNow}>
                {busy === 'send' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send data-icon="inline-start" />} Send now
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy !== null || dirty || !p.subject || !!p.senderProblem || !to} onClick={() => call('approve')}>
              {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} Approve this exact message
            </Button>
          )}
        </div>
        {p.status === 'approved' && !p.approvalCurrent && <p className="text-[12.5px] text-red-600 mt-3">The sender, recipient or text changed after you approved it. Approve it again.</p>}
        {p.approvalCurrent && !p.sendingEnabled && <p className="text-[12.5px] text-red-600 mt-3">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}
        {dirty && <p className="text-[12.5px] text-ink-muted mt-3">Save your edits first — approving and testing use the saved text.</p>}
      </div>
      <Outcome p={p} note={note} setNote={setNote} call={call} busy={busy} />
    </div>
  )
}

function Outcome({ p, note, setNote, call, busy }: { p: Props; note: string; setNote: (s: string) => void; call: (a: Action, e?: object, l?: string) => Promise<boolean>; busy: string | null }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-3">Outcome</p>
      <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (e.g. who replied, what they said)" className="text-[13.5px]" />
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => call('outcome', { outcome: 'replied', note }, 'replied')}>They replied</Button>
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => window.confirm('Mark as declined? Their address goes on the do-not-contact list for good.') && call('outcome', { outcome: 'declined', note }, 'declined')}>Said no — never write again</Button>
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => call('outcome', { outcome: 'skipped', note }, 'skipped')}>Park it</Button>
      </div>
      {p.status === 'skipped' && <Button variant="ghost" size="sm" className="mt-2" disabled={busy !== null} onClick={() => call('outcome', { outcome: 'researched' }, 'researched')}>Put back in the queue</Button>}
    </div>
  )
}
