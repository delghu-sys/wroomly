'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileText, Globe, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TestTemplateButton } from './TestTemplateButton'
import { SEND_INTERVAL_MIN, formatClock, formatHere, formatSlot, groupByCountry, planSends } from '@/lib/universities/schedule'

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
  /** Migration 049 applied: overnight sending can be used. */
  scheduleReady: boolean
  /** Messages handed to the mail provider and waiting for their time. */
  scheduledCount: number
  scheduledLast: string | null
  /** Send times (ISO) of messages already waiting, so a preview never reuses a minute. */
  scheduledTimes: string[]
  /** Country of each approved message, oldest approval first. */
  approvedCountries: (string | null)[]
}

/** Two bulk steps. Drafting only writes text. Sending asks you to confirm the
 *  sender and count first, and still passes every message through the gate. */
export function UniversitiesConsole({ researched, drafted, approved, fromDisplay, replyTo, enabled, dailyCap, sentToday, scheduleReady, scheduledCount, scheduledLast, scheduledTimes, approvedCountries }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function call(action: 'draft-all' | 'approve-all' | 'send-approved' | 'schedule-approved' | 'cancel-scheduled', extra: object = {}) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Failed.')
      if (action === 'draft-all') toast.success(`Drafted ${data.drafted}. ${data.skippedNoEmail} skipped (no address).`)
      else if (action === 'approve-all') toast.success(`Approved ${data.approved}.${data.skipped ? ` ${data.skipped} skipped (no address or text).` : ''}`)
      else if (action === 'cancel-scheduled') {
        toast.success(`Cancelled ${data.cancelled}. They are approved again.`)
        if (data.failed?.[0]) toast.error(`${data.failed[0].name}: ${data.failed[0].message}`)
      } else if (action === 'schedule-approved') {
        const refused = (data.outcomes ?? []).filter((o: { sent: boolean; message?: string }) => !o.sent)
        if (data.sent) toast.success(`Scheduled ${data.sent} across ${(data.groups ?? []).length} ${(data.groups ?? []).length === 1 ? 'country' : 'countries'}, each for 9:00 AM their time.`)
        else toast.error('Nothing was scheduled.')
        if (refused[0]) toast.error(`${refused[0].name}: ${refused[0].message}`)
        else if (data.remaining) toast.message('Click again to schedule the rest: they queue after the last one.')
      } else {
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

  function redo() {
    const ok = window.confirm(
      `Rewrite ${drafted} drafted email${drafted === 1 ? '' : 's'} from the current templates?\n\nAny edits you made to those drafts will be replaced. Approved emails are not touched.`,
    )
    if (ok) void call('draft-all', { redraft: true })
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

  function scheduleOvernight() {
    const cap = Math.max(0, dailyCap - sentToday)
    const items = approvedCountries.slice(0, cap).map((country, i) => ({ id: String(i), country }))
    const groups = groupByCountry(planSends(new Date(), items, scheduledTimes.map(t => new Date(t).getTime())))
    const lines = groups.slice(0, 14).map(g => {
      const range = g.count > 1 ? `${formatSlot(g.first, g.tz)} to ${formatClock(g.last, g.tz)}` : formatSlot(g.first, g.tz)
      return `${g.country} (${g.count}): ${range}${g.fallback ? ' [time zone unknown, sent at 2:30 AM Ann Arbor]' : ''}`
    })
    if (groups.length > 14) lines.push(`and ${groups.length - 14} more countries`)
    const first = groups[0]
    const ok = window.confirm(
      `Schedule ${items.length} approved email${items.length === 1 ? '' : 's'} to arrive at 9:00 AM, their time?\n\n${lines.join('\n')}\n\nOne every ${SEND_INTERVAL_MIN} minutes at least, Tuesday to Thursday only.${first ? `\nThe first leaves at ${formatHere(first.first)} your time.` : ''}\n\nFrom: ${fromDisplay}\nReplies go to: ${replyTo || '(not set)'}\nDaily cap: ${dailyCap} (${sentToday} already used in the last 24h)\n\nThey are checked now, exactly as for Send now. You can cancel any that are still waiting.`,
    )
    if (ok) void call('schedule-approved', { confirm: true })
  }

  function cancelAll() {
    const ok = window.confirm(`Cancel ${scheduledCount} scheduled email${scheduledCount === 1 ? '' : 's'}?\n\nThey go back to approved and nothing is sent.`)
    if (ok) void call('cancel-scheduled', { confirm: true })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center mb-4"><FileText className="w-5 h-5" strokeWidth={1.75} /></div>
        <h2 className="font-display text-lg tracking-tight text-ink">1. Draft</h2>
        <p className="text-[13.5px] text-ink-muted leading-relaxed mt-1.5">Fill the email for every university that has an address. Only writes text — nothing is approved or sent.</p>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Button size="sm" disabled={busy !== null || researched === 0} onClick={() => call('draft-all')}>
            {busy === 'draft-all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Draft ${researched} email${researched === 1 ? '' : 's'}`}
          </Button>
          {drafted > 0 && (
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={redo} title="Rewrite the drafted emails from the current template. Approved ones are left alone.">
              Redo {drafted} draft{drafted === 1 ? '' : 's'}
            </Button>
          )}
        </div>
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
            {busy === 'send-approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Send ${approved} now`}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null || approved === 0 || !scheduleReady} onClick={scheduleOvernight} title="Each email is scheduled to arrive at 9:00 AM in its own country, Tuesday to Thursday, three minutes apart">
            {busy === 'schedule-approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe data-icon="inline-start" />} Send {approved} at 9 AM their time
          </Button>
        </div>
        {!scheduleReady && <p className="text-[12.5px] text-red-600 mt-2">Overnight sending needs migration 049 (scheduled_for). Apply it to turn this button on.</p>}
        {scheduledCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-navy-soft/40 px-4 py-3">
            <p className="text-[13px] text-ink-soft">
              <span className="font-medium text-ink">{scheduledCount} scheduled</span>
              {scheduledLast ? `, the last at ${formatSlot(new Date(scheduledLast))}` : ''}. They send by themselves.
            </p>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={cancelAll}>
              {busy === 'cancel-scheduled' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Cancel ${scheduledCount}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
