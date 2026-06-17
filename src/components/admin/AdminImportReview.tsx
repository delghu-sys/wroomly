'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Check, X } from 'lucide-react'
import type { ExtractedListingDraft } from '@/types/listing-import'

interface AdminImportReviewProps {
  id: string
  draft: ExtractedListingDraft
  submitterEmail: string
}

const labelCls = 'block text-[12px] font-medium text-ink-soft mb-1'
const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-[oklch(0.84_0.17_85/0.3)] focus:border-[oklch(0.45_0.13_85)]'

export function AdminImportReview({ id, draft: initial, submitterEmail }: AdminImportReviewProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<ExtractedListingDraft>(initial)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  const set = <K extends keyof ExtractedListingDraft>(k: K, v: ExtractedListingDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  async function approve() {
    if (busy) return
    setBusy('approve')
    try {
      const res = await fetch('/api/admin/import-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id, draft }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not approve.')
        setBusy(null)
        return
      }
      toast.success(`Approved — claim email sent to ${submitterEmail}.`)
      router.push('/admin/import-review')
      router.refresh()
    } catch {
      toast.error('Could not approve.')
      setBusy(null)
    }
  }

  async function reject() {
    if (busy) return
    const reason = window.prompt('Reason for rejecting? (optional — the submitter is not emailed)')
    if (reason === null) return // cancelled
    setBusy('reject')
    try {
      const res = await fetch('/api/admin/import-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id, reason }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not reject.')
        setBusy(null)
        return
      }
      toast.success('Rejected. No email sent.')
      router.push('/admin/import-review')
      router.refresh()
    } catch {
      toast.error('Could not reject.')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl tracking-tight text-ink">AI draft — edit before approving</h2>

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={draft.title ?? ''} onChange={e => set('title', e.target.value || null)} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea className={inputCls} rows={5} value={draft.description ?? ''} onChange={e => set('description', e.target.value || null)} />
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
        <div>
          <label className={labelCls}>Neighborhood</label>
          <input className={inputCls} value={draft.neighborhood ?? ''} onChange={e => set('neighborhood', e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Listing type</label>
          <select className={inputCls} value={draft.listingType ?? ''} onChange={e => set('listingType', (e.target.value || null) as ExtractedListingDraft['listingType'])}>
            <option value="">—</option>
            <option value="ROOM">Room</option>
            <option value="STUDIO">Studio</option>
            <option value="SHARED_APARTMENT">Shared apartment</option>
            <option value="ENTIRE_APARTMENT">Entire apartment</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Bedrooms</label>
          <input type="number" className={inputCls} value={draft.bedrooms ?? ''} onChange={e => set('bedrooms', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className={labelCls}>Bathrooms</label>
          <input type="number" step="0.5" className={inputCls} value={draft.bathrooms ?? ''} onChange={e => set('bathrooms', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className={labelCls}>Building</label>
          <input className={inputCls} value={draft.buildingName ?? ''} onChange={e => set('buildingName', e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Floor plan</label>
          <input className={inputCls} value={draft.floorPlanName ?? ''} onChange={e => set('floorPlanName', e.target.value || null)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={!!draft.furnished} onChange={e => set('furnished', e.target.checked)} /> Furnished
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={!!draft.utilitiesIncluded} onChange={e => set('utilitiesIncluded', e.target.checked)} /> Utilities included
        </label>
      </div>

      {draft.amenities.length > 0 && (
        <div>
          <p className={labelCls}>Amenities</p>
          <div className="flex flex-wrap gap-1.5">
            {draft.amenities.map(a => (
              <span key={a} className="inline-flex px-2.5 py-1 rounded-full text-[12px] bg-white border border-line text-ink-soft">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI flags worth a glance */}
      {(draft.uncertaintyNotes.length > 0 || draft.safetyFlags.suspiciousOrScamLike || draft.safetyFlags.mayContainPersonalInfo) && (
        <div className="rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] p-4 text-[13px] text-[oklch(0.45_0.14_75)] space-y-1">
          {draft.safetyFlags.suspiciousOrScamLike && <p>⚠ AI flagged possible scam signals.</p>}
          {draft.safetyFlags.mayContainPersonalInfo && <p>⚠ AI flagged possible personal info in screenshots.</p>}
          {draft.uncertaintyNotes.map((n, i) => <p key={i}>• {n}</p>)}
        </div>
      )}

      <div className="flex gap-3 border-t border-line pt-5">
        <button type="button" onClick={approve} disabled={busy !== null}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition disabled:opacity-60">
          {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Approve & send claim email
        </button>
        <button type="button" onClick={reject} disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border border-line text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-60">
          {busy === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          Reject
        </button>
      </div>
    </div>
  )
}
