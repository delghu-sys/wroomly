'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Mail, Send, Check, X } from 'lucide-react'
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

interface TestSendResult {
  lead: { id: string; title: string | null; source: string; contactDomain: string | null } | null
  linkChecks: { label: string; ok: boolean }[]
  email: { to: string; subject: string } | null
  sent: boolean
  skippedLeads?: number
  error?: string
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
  // What's actually in the database. A test send mails the SAVED row, not
  // whatever is in the textarea, so the button has to say when they differ.
  const [saved, setSaved] = useState<OutreachTemplate>(initial)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestSendResult | null>(null)

  const preview = useMemo(() => buildOutreachEmail(template, SAMPLE_VARS), [template])
  const placeholders = useMemo(() => templatePlaceholders(template.body), [template.body])
  const missingClaimUrl = !placeholders.has('claimUrl')
  const unsaved = template.subject !== saved.subject || template.body !== saved.body

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
      setSaved(template)
      toast.success('Saved. The next outreach run uses this.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /** Mails the real next outreach email to the signed-in admin. The address
   *  comes from the session on the server — there is nothing to type here. */
  async function sendTest() {
    if (testing) return
    setTesting(true)
    setTest(null)
    try {
      const res = await fetch('/api/admin/agents/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execute: true }),
      })
      const json = (await res.json().catch(() => ({}))) as TestSendResult & { error?: string }
      setTest(json)
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Test send failed.')
        return
      }
      toast.success(`Sent to ${json.email?.to}. Check your inbox.`)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setTesting(false)
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-navy-deep text-maize-bright font-semibold text-sm hover:bg-navy-deep/90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-line bg-surface text-ink font-semibold text-sm hover:bg-navy-soft/40 transition disabled:opacity-60"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send me a test
            </button>
          </div>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            The test goes to your own account email, with a real lead&rsquo;s live claim link. The lead
            is not contacted and stays in the queue.
            {unsaved && (
              <span className="text-[oklch(0.55_0.18_25)]">
                {' '}
                You have unsaved edits — a test sends the <em>saved</em> version. Save first.
              </span>
            )}
          </p>

          {test && (
            <div className="rounded-2xl border border-line bg-navy-soft/20 p-4 text-[13px] space-y-3">
              {test.lead && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-1">
                    Lead used
                  </p>
                  <p className="text-ink">{test.lead.title ?? '(untitled)'}</p>
                  <p className="text-ink-muted text-[12px]">
                    {test.lead.source}
                    {test.lead.contactDomain && ` · real contact …@${test.lead.contactDomain} (not emailed)`}
                  </p>
                </div>
              )}
              {(test.skippedLeads ?? 0) > 0 && (
                <p className="text-ink-muted text-[12px]">
                  Skipped {test.skippedLeads} lead(s) whose claim link would not have resolved —
                  usually a draft already claimed by opening its link.
                </p>
              )}
              {test.linkChecks.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-1.5">
                    Claim link pre-flight
                  </p>
                  <ul className="space-y-1">
                    {test.linkChecks.map(c => (
                      <li key={c.label} className="flex items-center gap-2 text-ink-soft">
                        {c.ok ? (
                          <Check className="w-3.5 h-3.5 text-[oklch(0.50_0.13_142)] shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[oklch(0.55_0.18_25)] shrink-0" />
                        )}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {test.error ? (
                <p className="text-[oklch(0.55_0.18_25)]">{test.error}</p>
              ) : (
                test.sent && (
                  <p className="text-[oklch(0.40_0.13_142)] font-medium">
                    Delivered to {test.email?.to}.
                  </p>
                )
              )}
            </div>
          )}
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
