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
  state: 'none' | 'drafted' | 'approved' | 'sent'
  subject: string
  body: string
  to: string
  fromDisplay: string
  replyTo: string
  approvalCurrent: boolean
  senderProblem: string | null
  sendingEnabled: boolean
  daysSince: number
  minDays: number
  sent: { from: string; to: string; replyTo: string; subject: string; body: string; sentAt: string } | null
}

type Action = 'draft' | 'save' | 'approve' | 'withdraw' | 'test' | 'send'

/** The one follow-up for this university — same discipline as the first email. */
export function FollowupEditor(p: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState(p.subject)
  const [body, setBody] = useState(p.body)
  const [busy, setBusy] = useState<Action | null>(null)
  const dirty = subject !== p.subject || body !== p.body
  const waitDays = Math.max(0, p.minDays - p.daysSince)

  async function call(action: Action, extra: object = {}) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/universities/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.message ?? data.error ?? 'Failed.')
      if (action === 'test') toast.success(`Test sent to ${data.sentTo}. From: ${data.from}`)
      else if (action === 'send') toast.success(`Follow-up sent to ${p.name}.`)
      else toast.success('Done.')
      router.refresh()
    } catch { toast.error('Network error. Please try again.') } finally { setBusy(null) }
  }

  const heading = <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold">Follow-up</p>

  if (p.sent) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
        {heading}
        <p className="text-[12.5px] text-ink-muted mt-1">Sent {p.sent.sentAt.slice(0, 16).replace('T', ' ')} UTC — exactly as it went out. There is only ever one.</p>
        <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-1 text-[13.5px]">
          <dt className="text-ink-muted">From</dt><dd className="text-ink">{p.sent.from}</dd>
          <dt className="text-ink-muted">To</dt><dd className="text-ink">{p.sent.to}</dd>
          <dt className="text-ink-muted">Subject</dt><dd className="text-ink">{p.sent.subject}</dd>
        </dl>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-soft border-t border-line pt-4">{p.sent.body}</pre>
      </div>
    )
  }

  if (p.state === 'none') {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
        {heading}
        <p className="text-[13.5px] text-ink-muted mt-2">
          {waitDays > 0 ? `A follow-up becomes due in ${waitDays} day${waitDays === 1 ? '' : 's'} (${p.minDays} days after the first email).` : 'A follow-up is due now. Draft it from the Follow-ups box on the main page.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-1">
      {heading}
      <p className="text-[12.5px] text-ink-muted mt-1">{waitDays > 0 ? `Can be sent in ${waitDays} day${waitDays === 1 ? '' : 's'}.` : 'Due now.'} Edit it freely; any edit withdraws the approval.</p>
      <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-1 text-[13.5px]">
        <dt className="text-ink-muted">From</dt><dd className="text-ink font-medium">{p.fromDisplay}</dd>
        <dt className="text-ink-muted">Reply-to</dt><dd className={p.replyTo ? 'text-ink' : 'text-red-600'}>{p.replyTo || 'not set'}</dd>
        <dt className="text-ink-muted">To</dt><dd className="text-ink">{p.to}</dd>
      </dl>
      {p.senderProblem && <p className="text-[12.5px] text-red-600 mt-2">{p.senderProblem}</p>}
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5"><Label htmlFor="fu-subject">Subject</Label><Input id="fu-subject" value={subject} onChange={e => setSubject(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="fu-body">Message</Label><Textarea id="fu-body" rows={12} value={body} onChange={e => setBody(e.target.value)} className="text-[13.5px] leading-relaxed" /></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={busy !== null || !dirty} onClick={() => call('save', { id: p.id, subject, body })}>
          {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save data-icon="inline-start" />} Save
        </Button>
        <Button variant="outline" size="sm" disabled={busy !== null || dirty} onClick={() => call('test', { id: p.id })} title="Mails this follow-up to your own address">
          {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail data-icon="inline-start" />} Send me a test
        </Button>
        {p.approvalCurrent ? (
          <>
            <span className="inline-flex items-center gap-1 text-[13px] text-[oklch(0.40_0.13_142)]"><Check className="w-4 h-4" /> Approved</span>
            <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => call('withdraw', { ids: [p.id] })}>Withdraw approval</Button>
            <Button size="sm" disabled={busy !== null || !p.sendingEnabled || waitDays > 0} onClick={() => window.confirm(`Send this follow-up to ${p.to}?\n\nFrom: ${p.fromDisplay}\nReplies go to: ${p.replyTo}\nSubject: ${p.subject}\n\nThere is only ever one. This cannot be undone.`) && void call('send', { id: p.id, confirm: true })}>
              {busy === 'send' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send data-icon="inline-start" />} Send now
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy !== null || dirty || !!p.senderProblem} onClick={() => call('approve', { ids: [p.id] })}>
            {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} Approve this exact message
          </Button>
        )}
      </div>
      {dirty && <p className="text-[12.5px] text-ink-muted mt-3">Save your edits first — approving and testing use the saved text.</p>}
      {p.approvalCurrent && waitDays > 0 && <p className="text-[12.5px] text-ink-muted mt-3">Approved, but it can only be sent {waitDays} day{waitDays === 1 ? '' : 's'} from now.</p>}
      {p.approvalCurrent && !p.sendingEnabled && <p className="text-[12.5px] text-red-600 mt-3">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}
    </div>
  )
}
