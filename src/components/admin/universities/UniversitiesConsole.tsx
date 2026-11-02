'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileText, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TestTemplateButton } from './TestTemplateButton'

interface Props {
  researched: number
  /** Drafted, with an address and text — what "Approve all" would approve. */
  drafted: number
  approved: number
  fromDisplay: string
  replyTo: string
  enabled: boolean
  dailyCap: number
  sentToday: number
}

/** Two bulk steps. Drafting only writes text. Sending asks you to confirm the
 *  sender and count first, and still passes every message through the gate. */
export function UniversitiesConsole({ researched, drafted, approved, fromDisplay, replyTo, enabled, dailyCap, sentToday }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function call(action: 'draft-all' | 'approve-all' | 'send-approved', extra: object = {}) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Failed.')
      if (action === 'draft-all') toast.success(`Drafted ${data.drafted}. ${data.skippedNoEmail} skipped (no address).`)
      else if (action === 'approve-all') toast.success(`Approved ${data.approved}.${data.skipped ? ` ${data.skipped} skipped (no address or text).` : ''}`)
      else {
        const refused = (data.outcomes ?? []).filter((o: { sent: boolean; message?: string }) => !o.sent)
        toast.success(`Sent ${data.sent}.${data.remaining ? ` ${data.remaining} approved ${data.remaining === 1 ? 'is' : 'are'} still waiting.` : ''}`)
        if (refused[0]) toast.error(`${refused[0].name}: ${refused[0].message}`)
        else if (data.remaining) toast.message('Click Send again to continue — each click sends for up to about 45 seconds.')
      }
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  function approveAll() {
    const ok = window.confirm(
      `Approve ${drafted} drafted email${drafted === 1 ? '' : 's'}?\n\nFrom: ${fromDisplay}\nReplies go to: ${replyTo || '(not set)'}\n\nEach one is approved exactly as it is now. Edit any of them afterwards and its approval is withdrawn.\nNothing is sent by approving.`,
    )
    if (ok) void call('approve-all', { confirm: true })
  }

  function sendApproved() {
    const ok = window.confirm(
      `Send ${approved} approved email${approved === 1 ? '' : 's'} to universities?\n\nFrom: ${fromDisplay}\nReplies go to: ${replyTo || '(not set)'}\nDaily cap: ${dailyCap} (${sentToday} already sent in the last 24h)\n\nOnly messages you approved, unedited since, will go.`,
    )
    if (ok) void call('send-approved', { confirm: true })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center mb-4"><FileText className="w-5 h-5" strokeWidth={1.75} /></div>
        <h2 className="font-display text-lg tracking-tight text-ink">1. Draft</h2>
        <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1.5">Fill the email for every university that has an address. Only writes text — nothing is approved or sent.</p>
        <Button size="sm" className="mt-5" disabled={busy !== null || researched === 0} onClick={() => call('draft-all')}>
          {busy === 'draft-all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Draft ${researched} email${researched === 1 ? '' : 's'}`}
        </Button>
      </div>
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center mb-4"><Send className="w-5 h-5" strokeWidth={1.75} /></div>
        <h2 className="font-display text-lg tracking-tight text-ink">2. Review, approve, send</h2>
        <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1.5">
          Open a university to read and approve its exact message, or approve every draft here once you have checked a few. Approved messages can be sent one at a time or all together.
        </p>
        {!enabled && <p className="text-[12.5px] text-red-600 mt-2">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}
        {!replyTo && <p className="text-[12.5px] text-red-600 mt-2">Set the Reply-to below and save it before approving.</p>}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <TestTemplateButton disabled={busy !== null || !replyTo} hint={replyTo ? undefined : 'Set and save the Reply-to first'} />
          <Button variant="outline" size="sm" disabled={busy !== null || drafted === 0 || !replyTo} onClick={approveAll}>
            {busy === 'approve-all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} Approve all {drafted}
          </Button>
          <Button size="sm" disabled={busy !== null || approved === 0} onClick={sendApproved}>
            {busy === 'send-approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Send ${approved} approved`}
          </Button>
        </div>
      </div>
    </div>
  )
}
