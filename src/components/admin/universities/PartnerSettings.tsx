'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { renderEmail } from '@/lib/universities/template'
import { TestTemplateButton } from './TestTemplateButton'

interface Settings {
  from_name: string
  from_email: string
  reply_to: string
  daily_cap: number
  subject: string
  body: string
}

export function PartnerSettings({ initial, sample }: { initial: Settings; sample: { name: string; country: string | null; umich_units: string[]; office_name: string | null; contact_name: string | null } }) {
  const router = useRouter()
  const [s, setS] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(initial)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(x => ({ ...x, [k]: v }))

  const preview = useMemo(() => {
    try { return { ok: true as const, ...renderEmail(sample, s) } } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : 'Invalid template' } }
  }, [s, sample])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/universities/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Could not save.')
      toast.success('Saved. Messages approved before this change need approving again.')
      router.refresh()
    } catch { toast.error('Network error. Please try again.') } finally { setSaving(false) }
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-1">
      <h2 className="font-display text-lg tracking-tight text-ink">Sender and template</h2>
      <p className="text-[13.5px] text-ink-muted mt-1">
        Every email is sent <strong className="text-ink">From</strong> the address below, and replies go to <strong className="text-ink">Reply-to</strong>. Changing either voids existing approvals.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <div className="space-y-1.5"><Label htmlFor="from_name">From name</Label><Input id="from_name" value={s.from_name} onChange={e => set('from_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="from_email">From address (must be @wroomly.app)</Label><Input id="from_email" value={s.from_email} onChange={e => set('from_email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="reply_to">Reply-to (the inbox you read)</Label><Input id="reply_to" type="email" value={s.reply_to} onChange={e => set('reply_to', e.target.value)} placeholder="you@gmail.com" /></div>
        <div className="space-y-1.5"><Label htmlFor="daily_cap">Daily send cap</Label><Input id="daily_cap" type="number" min={1} max={200} value={s.daily_cap} onChange={e => set('daily_cap', Number(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="subject">Subject</Label><Input id="subject" value={s.subject} onChange={e => set('subject', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={16} value={s.body} onChange={e => set('body', e.target.value)} className="font-mono text-[12.5px] leading-relaxed" />
            <p className="text-[12px] text-ink-muted">Placeholders: <code>{'{{greeting}}'}</code> <code>{'{{university}}'}</code> <code>{'{{partnership}}'}</code> <code>{'{{country}}'}</code></p>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Preview — for {sample.name}</p>
          <div className="rounded-2xl border border-line bg-navy-soft/30 p-4 text-[13px]">
            <p className="text-ink-muted text-[12px]">From: {s.from_name} &lt;{s.from_email}&gt;</p>
            <p className="text-ink-muted text-[12px]">Reply-to: {s.reply_to || '— not set —'}</p>
            {preview.ok ? (<><p className="text-ink font-medium mt-2">{preview.subject}</p><p className="text-ink-soft whitespace-pre-wrap leading-relaxed mt-2">{preview.body}</p></>) : <p className="text-red-600 mt-2">{preview.error}</p>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-5">
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save data-icon="inline-start" />} Save
        </Button>
        <TestTemplateButton disabled={dirty || saving || !initial.reply_to} hint={dirty ? 'Save first — the test uses the saved settings' : undefined} />
        {dirty && <span className="text-[12.5px] text-ink-muted">Save first: the test uses the saved settings.</span>}
      </div>
    </div>
  )
}
