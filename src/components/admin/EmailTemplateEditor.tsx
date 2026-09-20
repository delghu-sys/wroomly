'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Mail } from 'lucide-react'
import {
  buildOutreachEmail,
  templatePlaceholders,
  type OutreachTemplate,
} from '@/lib/agents/outreach-template'

interface Props {
  initial: OutreachTemplate
}

const labelCls = 'block text-[12px] font-medium text-ink-soft mb-1'
const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-maize-bright/30 focus:border-gold-deep'

// A believable stand-in so the preview looks like a real email even before
// anyone's been discovered. buildOutreachEmail is pure — imported here
// directly, so the preview renders as the admin types, with no round trip.
const SAMPLE_VARS = {
  title: '2 Bed at Broadview Apartments',
  claimUrl: 'https://wroomly.app/claim-listing/•••••••••••••••••••••••',
}

/**
 * The one editable outreach email — subject + body — with a live preview.
 * Catches the one thing that could break outreach before Save, not after:
 * a missing {{claimUrl}} (the email would have no working link at all).
 *
 * There is no footer here to warn about anymore — no unsubscribe link, no
 * postal address. That was removed at Hugo's request on 2026-09-20 against
 * the assistant's advice (CAN-SPAM requires both on commercial email); see
 * outreach-template.ts for the full note.
 */
export function EmailTemplateEditor({ initial }: Props) {
  const [template, setTemplate] = useState<OutreachTemplate>(initial)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => buildOutreachEmail(template, SAMPLE_VARS), [template])
  const placeholders = useMemo(() => templatePlaceholders(template.body), [template.body])
  const missingClaimUrl = !placeholders.has('claimUrl')

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/agents/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not save.')
        return
      }
      toast.success('Saved. The next outreach run uses this.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">Outreach email</h2>
          <p className="text-[13px] text-ink-muted">
            What step 3 sends. One email per person, ever — this is it.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-5">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Subject</label>
            <input
              className={inputCls}
              value={template.subject}
              onChange={e => setTemplate(t => ({ ...t, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>
              Body{' '}
              <span className="text-ink-muted font-normal">
                — use <code className="text-[11px]">{'{{title}}'}</code> and{' '}
                <code className="text-[11px]">{'{{claimUrl}}'}</code>
              </span>
            </label>
            <textarea
              className={`${inputCls} font-mono text-[13px]`}
              rows={12}
              value={template.body}
              onChange={e => setTemplate(t => ({ ...t, body: e.target.value }))}
            />
            {missingClaimUrl && (
              <p className="text-[12px] text-[oklch(0.55_0.18_25)] mt-1.5">
                No <code>{'{{claimUrl}}'}</code> in the body — this email would have no working link.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-navy-deep text-maize-bright font-semibold text-sm hover:bg-navy-deep/90 transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        <div>
          <p className={labelCls}>Preview — as it will render, with sample values</p>
          <div className="rounded-2xl border border-line bg-navy-soft/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Subject</p>
            <p className="text-ink font-medium mb-4">{preview.subject}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Body</p>
            <p className="text-ink-soft whitespace-pre-wrap text-[13px] leading-relaxed">{preview.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
