'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  researched: number
  approved: number
  fromDisplay: string
  replyTo: string
  enabled: boolean
  dailyCap: number
  sentToday: number
}

/** Two bulk steps. Drafting only writes text. Sending asks you to confirm the
 *  sender and count first, and still passes every message through the gate. */
export function UniversitiesConsole({ researched, approved, fromDisplay, replyTo, enabled, dailyCap, sentToday }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function call(action: 'draft-all' | 'send-approved', extra: object = {}) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Failed.')
      if (action === 'draft-all') toast.success(`Drafted ${data.drafted}. ${data.skippedNoEmail} skipped (no address).`)
      else {
        const refused = (data.outcomes ?? []).filter((o: { sent: boolean; message?: string }) => !o.sent)
        toast.success(`Sent ${data.sent} of ${data.outcomes.length}.`)
        if (refused[0]) toast.error(`${refused[0].name}: ${refused[0].message}`)
      }
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(null)
    }
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
          Open a university to read and approve its exact message. Approved messages can be sent one at a time there, or all together here.
        </p>
        {!enabled && <p className="text-[12.5px] text-red-600 mt-2">Real sending is off: UNIVERSITY_OUTREACH_ENABLED is not &ldquo;true&rdquo; on the server.</p>}
        <Button size="sm" className="mt-4" disabled={busy !== null || approved === 0} onClick={sendApproved}>
          {busy === 'send-approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Send ${approved} approved`}
        </Button>
      </div>
    </div>
  )
}
