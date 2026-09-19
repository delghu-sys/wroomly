'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import type { ExtractedListingDraft } from '@/types/listing-import'

interface Props {
  importRequestId: string
  draft: ExtractedListingDraft
}

const labelCls = 'block text-[12px] font-medium text-ink-soft mb-1'
const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-maize-bright/30 focus:border-gold-deep'

/**
 * Edits an agent-sourced listing draft in place. Same field set as
 * AdminImportReview (the AI-importer's equivalent), but with ONE action —
 * Save — instead of Approve/Reject. There is no approval step here: the
 * outreach agent already decides, independently, whether and when to email
 * this person. Saving only updates extracted_data via /api/admin/agents/draft,
 * which never sends anything.
 */
export function AgentDraftEditor({ importRequestId, draft: initial }: Props) {
  const router = useRouter()
  const [draft, setDraft] = useState<ExtractedListingDraft>(initial)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ExtractedListingDraft>(k: K, v: ExtractedListingDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/agents/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importRequestId, draft }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not save.')
        return
      }
      toast.success('Saved. The claim link will show these values.')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={draft.title ?? ''} onChange={e => set('title', e.target.value || null)} />
      </div>
      <div>
        <label className={labelCls}>
          Description{' '}
          <span className="text-ink-muted font-normal">(left blank on purpose — nothing here is fabricated)</span>
        </label>
        <textarea className={inputCls} rows={4} value={draft.description ?? ''} onChange={e => set('description', e.target.value || null)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Rent / mo (USD)</label>
          <input type="number" className={inputCls} value={draft.rentMonthly ?? ''} onChange={e => set('rentMonthly', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className={labelCls}>Deposit (USD)</label>
          <input type="number" className={inputCls} value={draft.depositAmount ?? ''} onChange={e => set('depositAmount', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className={labelCls}>Available from</label>
          <input type="date" className={inputCls} value={draft.availableFrom ?? ''} onChange={e => set('availableFrom', e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Available to</label>
          <input type="date" className={inputCls} value={draft.availableTo ?? ''} onChange={e => set('availableTo', e.target.value || null)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Dates as originally posted</label>
          <input className={inputCls} value={draft.availabilityNotes ?? ''} onChange={e => set('availabilityNotes', e.target.value || null)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Street address{' '}
            <span className="text-[oklch(0.55_0.20_25)] font-bold">(we never had this — the poster fills it in)</span>
          </label>
          <input
            className={`${inputCls} ${!draft.address ? 'border-[oklch(0.80_0.12_25)] bg-[oklch(0.99_0.01_25)]' : ''}`}
            placeholder="e.g. 123 E William St, Ann Arbor, MI 48104"
            value={draft.address ?? ''}
            onChange={e => set('address', e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelCls}>Neighborhood</label>
          <input className={inputCls} value={draft.neighborhood ?? ''} onChange={e => set('neighborhood', e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Building</label>
          <input className={inputCls} value={draft.buildingName ?? ''} onChange={e => set('buildingName', e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Bedrooms</label>
          <input type="number" className={inputCls} value={draft.bedrooms ?? ''} onChange={e => set('bedrooms', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className={labelCls}>Bathrooms</label>
          <input type="number" step="0.5" className={inputCls} value={draft.bathrooms ?? ''} onChange={e => set('bathrooms', e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>

      {draft.uncertaintyNotes.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] p-4 text-[13px] text-[oklch(0.45_0.14_75)] space-y-1">
          {draft.uncertaintyNotes.map((n, i) => (
            <p key={i}>• {n}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-navy-deep text-maize-bright font-semibold text-sm hover:bg-navy-deep/90 transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>
    </div>
  )
}
