'use client'

import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

/**
 * The report flow the Trust & Safety page promises. One dialog for every
 * reportable thing: listings, profiles, message threads.
 *
 * Reasons mirror /api/reports exactly — the server validates against the
 * same list. Confirmation copy deliberately makes no response-time promise
 * (FTC §5: an unmet claim in UI copy is a deceptive practice).
 */

const REASONS = [
  'Scam or fraud',
  'Discriminatory language',
  "Listing isn't real or uses stolen photos",
  'Harassment',
  'Spam',
  'Other',
] as const

export function ReportDialog({
  targetType,
  targetId,
  /** What the trigger says; default keeps it quiet ("Report"). */
  label = 'Report',
  className = '',
}: {
  targetType: 'listing' | 'user' | 'message'
  targetId: string
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!reason) return
    setSending(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, detail }),
      })
      if (res.status === 401) {
        toast.error('Please sign in to file a report.')
        setSending(false)
        return
      }
      if (!res.ok) throw new Error('failed')
      setOpen(false)
      setReason(null)
      setDetail('')
      toast.success("Thanks, we're on it. Every report gets a human review.")
    } catch {
      toast.error('Could not submit the report. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const noun =
    targetType === 'listing' ? 'listing' : targetType === 'user' ? 'profile' : 'conversation'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={label || 'Report'}
            className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink transition-colors ${className}`}
          >
            <Flag className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
          </button>
        }
      />
      <DialogContent className="rounded-3xl border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight text-ink">
            Report this {noun}
          </DialogTitle>
          <DialogDescription className="text-ink-soft">
            Tell us what&rsquo;s wrong. Reports are confidential; the other
            side never sees who filed one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5" role="radiogroup" aria-label="Reason">
          {REASONS.map(r => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-2xl border text-sm transition-colors ${
                reason === r
                  ? 'border-navy-deep bg-navy-soft/50 text-ink font-medium'
                  : 'border-line bg-surface text-ink-soft hover:border-navy/40'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Anything else we should know? (optional)"
          className="rounded-2xl border-line"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={!reason || sending}
          className="press w-full h-11 rounded-full bg-navy-deep text-maize-bright font-semibold hover:bg-navy-deep/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
