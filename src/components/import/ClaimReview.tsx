'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Info, Upload } from 'lucide-react'
import type { ExtractedListingDraft } from '@/types/listing-import'
import { mapSourceAttribution, type SourceLabel } from '@/lib/listing-import/normalize'

interface ClaimReviewProps {
  token: string
  draft: ExtractedListingDraft
  personalPhotos: { path: string; url: string }[]
  buildingPhotos: { path: string; url: string }[]
  enrichmentUsed: boolean
  /** Whether the signed-in account is a verified @umich.edu email. */
  isUmichEmail: boolean
}

const LABEL_TEXT: Record<SourceLabel, string> = {
  PERSONAL: 'From your post',
  BUILDING: 'Enriched from building',
  AI: 'AI-generated',
  NEEDS_CONFIRMATION: 'Needs your confirmation',
  UNKNOWN: '',
}
const LABEL_STYLE: Record<SourceLabel, string> = {
  PERSONAL: 'bg-[oklch(0.55_0.15_142/0.14)] text-[oklch(0.40_0.13_142)]',
  BUILDING: 'bg-[oklch(0.84_0.17_85/0.18)] text-[oklch(0.40_0.12_85)]',
  AI: 'bg-navy-soft text-navy',
  NEEDS_CONFIRMATION: 'bg-[oklch(0.97_0.04_75)] text-[oklch(0.50_0.15_75)]',
  UNKNOWN: 'hidden',
}

function Badge({ label }: { label: SourceLabel }) {
  if (!label || label === 'UNKNOWN') return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${LABEL_STYLE[label]}`}>
      {LABEL_TEXT[label]}
    </span>
  )
}

const labelCls = 'flex items-center gap-2 text-[13px] font-medium text-ink-soft mb-1.5'
const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-4 focus:ring-[oklch(0.84_0.17_85/0.18)] focus:border-[oklch(0.45_0.13_85)] transition'

export function ClaimReview({ token, draft: initial, personalPhotos: initialPhotos, buildingPhotos, enrichmentUsed, isUmichEmail }: ClaimReviewProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<ExtractedListingDraft>(initial)
  // Photos can grow at review time (essential for text-only imports).
  const [personalPhotos, setPersonalPhotos] = useState(initialPhotos)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(
    // Default-select personal photos the AI thinks are housing photos.
    new Set(
      initial.photos
        .filter(p => p.sourceType === 'USER_UPLOADED_PERSONAL' && p.isLikelyHousingPhoto && !p.shouldRequireUserConfirmationBeforePublish)
        .map(p => p.sourceUrl)
        .filter(url => initialPhotos.some(pp => pp.url === url)),
    ),
  )
  const [confirmAccuracy, setConfirmAccuracy] = useState(false)
  const [confirmEnrichment, setConfirmEnrichment] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [missing, setMissing] = useState<string[]>([])

  async function addPhotos(files: File[]) {
    if (files.length === 0 || uploadingPhotos) return
    setUploadingPhotos(true)
    try {
      const fd = new FormData()
      fd.append('token', token)
      files.forEach(f => fd.append('photos', f))
      const res = await fetch('/api/listing-imports/photos', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not upload photos.')
        return
      }
      const added: { path: string; url: string }[] = json.photos
      setPersonalPhotos(prev => [...prev, ...added])
      setSelectedPhotos(prev => {
        const next = new Set(prev)
        added.forEach(p => next.add(p.url))
        return next
      })
    } catch {
      toast.error('Could not upload photos.')
    } finally {
      setUploadingPhotos(false)
    }
  }

  // Associate the draft with this account on mount (idempotent).
  useEffect(() => {
    fetch('/api/listing-imports/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [token])

  const attribution = useMemo(() => mapSourceAttribution(draft.sourceAttribution), [draft.sourceAttribution])
  const set = <K extends keyof ExtractedListingDraft>(k: K, v: ExtractedListingDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  function togglePhoto(url: string) {
    setSelectedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  async function publish() {
    if (publishing) return
    if (!isUmichEmail) {
      toast.error('You need a verified @umich.edu email to publish.')
      return
    }
    setMissing([])
    setPublishing(true)
    const confirmedPhotoPaths = personalPhotos.filter(p => selectedPhotos.has(p.url)).map(p => p.path)
    try {
      const res = await fetch('/api/listing-imports/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          draft,
          confirmedPhotoPaths,
          userConfirmedAccuracy: confirmAccuracy,
          userConfirmedEnrichment: confirmEnrichment,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (json.missing) setMissing(json.missing)
        toast.error(json.error ?? 'Could not publish.')
        setPublishing(false)
        return
      }
      toast.success('Listing published!')
      router.push(`/listings/${json.listingId}`)
    } catch {
      toast.error('Could not publish. Try again.')
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Warnings */}
      <div className="rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3 text-[13px] text-[oklch(0.45_0.14_75)] flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>AI can make mistakes. Review everything before publishing.</span>
      </div>
      {enrichmentUsed && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-soft flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[oklch(0.45_0.13_85)]" />
          <span>Some details were enriched from the building or floor plan source you provided. Confirm they apply to your specific unit before publishing.</span>
        </div>
      )}

      {/* Core editable fields */}
      <Field label="Title" badge={attribution.title}>
        <input className={inputCls} value={draft.title ?? ''} onChange={e => set('title', e.target.value || null)} />
      </Field>
      <Field label="Description" badge={attribution.description}>
        <textarea className={inputCls} rows={5} value={draft.description ?? ''} onChange={e => set('description', e.target.value || null)} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Monthly rent (USD)" badge={attribution.rentMonthly}>
          <input type="number" className={inputCls} value={draft.rentMonthly ?? ''} onChange={e => set('rentMonthly', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Deposit (USD)" badge={attribution.depositAmount}>
          <input type="number" className={inputCls} value={draft.depositAmount ?? ''} onChange={e => set('depositAmount', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Available from" badge={attribution.availableFrom}>
          <input type="date" className={inputCls} value={draft.availableFrom ?? ''} onChange={e => set('availableFrom', e.target.value || null)} />
        </Field>
        <Field label="Available to" badge={attribution.availableTo}>
          <input type="date" className={inputCls} value={draft.availableTo ?? ''} onChange={e => set('availableTo', e.target.value || null)} />
        </Field>
        <Field label="Neighborhood" badge={attribution.neighborhood}>
          <input className={inputCls} value={draft.neighborhood ?? ''} onChange={e => set('neighborhood', e.target.value || null)} />
        </Field>
        <Field label="Listing type" badge={attribution.listingType}>
          <select className={inputCls} value={draft.listingType ?? ''} onChange={e => set('listingType', (e.target.value || null) as ExtractedListingDraft['listingType'])}>
            <option value="">Select…</option>
            <option value="ROOM">Room</option>
            <option value="STUDIO">Studio</option>
            <option value="SHARED_APARTMENT">Shared apartment</option>
            <option value="ENTIRE_APARTMENT">Entire apartment</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Bedrooms" badge={attribution.bedrooms}>
          <input type="number" className={inputCls} value={draft.bedrooms ?? ''} onChange={e => set('bedrooms', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Bathrooms" badge={attribution.bathrooms}>
          <input type="number" step="0.5" className={inputCls} value={draft.bathrooms ?? ''} onChange={e => set('bathrooms', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Building name" badge={attribution.buildingName}>
          <input className={inputCls} value={draft.buildingName ?? ''} onChange={e => set('buildingName', e.target.value || null)} />
        </Field>
        <Field label="Floor plan" badge={attribution.floorPlanName}>
          <input className={inputCls} value={draft.floorPlanName ?? ''} onChange={e => set('floorPlanName', e.target.value || null)} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={!!draft.furnished} onChange={e => set('furnished', e.target.checked)} /> Furnished
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={!!draft.utilitiesIncluded} onChange={e => set('utilitiesIncluded', e.target.checked)} /> Utilities included
        </label>
      </div>

      {/* Amenities (read-only chips, with source split) */}
      {(draft.amenities.length > 0) && (
        <div>
          <p className={labelCls}>Amenities <Badge label={attribution.buildingAmenities ?? 'UNKNOWN'} /></p>
          <div className="flex flex-wrap gap-1.5">
            {draft.amenities.map(a => (
              <span key={a} className="inline-flex px-2.5 py-1 rounded-full text-[12px] bg-white border border-line text-ink-soft">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Photo selection + add */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className={`${labelCls} mb-0`}>
            {personalPhotos.length > 0 ? 'Your photos — pick which to publish' : 'Add photos of your place'}
          </p>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-navy hover:text-ink cursor-pointer">
            {uploadingPhotos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploadingPhotos ? 'Uploading…' : 'Add photos'}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              disabled={uploadingPhotos}
              onChange={e => addPhotos(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>
        {personalPhotos.length === 0 ? (
          <p className="text-[12px] text-ink-muted">
            You imported text only — add at least one real photo of your place to publish.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {personalPhotos.map(p => {
              const on = selectedPhotos.has(p.url)
              return (
                <button key={p.path} type="button" onClick={() => togglePhoto(p.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${on ? 'border-[oklch(0.45_0.13_85)]' : 'border-transparent opacity-60'}`}>
                  <Image src={p.url} alt="" fill className="object-cover" sizes="120px" />
                  {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[oklch(0.45_0.13_85)] text-white text-[11px] flex items-center justify-center">✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {buildingPhotos.length > 0 && (
        <p className="text-[12px] text-ink-muted">
          Building/floor-plan images you uploaded are kept as reference and are <strong>not</strong> published as listing photos.
        </p>
      )}

      {/* Uncertainty + conflicts */}
      {draft.conflictsBetweenSources.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-ink-soft">
          <p className="font-medium text-ink mb-2">We used your post where sources disagreed:</p>
          <ul className="space-y-1 list-disc pl-4">{draft.conflictsBetweenSources.map((c, i) => <li key={i}>{c.note}</li>)}</ul>
        </div>
      )}
      {draft.uncertaintyNotes.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-ink-soft">
          <p className="font-medium text-ink mb-2">Worth double-checking:</p>
          <ul className="space-y-1 list-disc pl-4">{draft.uncertaintyNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}

      {/* Missing fields (from a failed publish attempt) */}
      {missing.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.85_0.10_25)] bg-[oklch(0.97_0.04_25)] p-4 text-[13px] text-[oklch(0.45_0.18_25)]">
          <p className="font-medium mb-2">Before you can publish:</p>
          <ul className="space-y-1 list-disc pl-4">{missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      {/* Confirmations */}
      <div className="space-y-2.5 border-t border-line pt-5">
        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={confirmAccuracy} onChange={e => setConfirmAccuracy(e.target.checked)} />
          <span>I confirm that I reviewed this listing and that the information is accurate for the unit/room I am subletting.</span>
        </label>
        {enrichmentUsed && (
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[oklch(0.45_0.13_85)]" checked={confirmEnrichment} onChange={e => setConfirmEnrichment(e.target.checked)} />
            <span>I confirm the building/floor-plan details apply to my specific unit.</span>
          </label>
        )}
      </div>

      {!isUmichEmail && (
        <div className="rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3 text-[13px] text-[oklch(0.45_0.14_75)] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You’re signed in with a non-@umich.edu email. Publishing a listing
            requires a verified University of Michigan email — sign in with your
            @umich.edu account to publish. Your draft is saved.
          </span>
        </div>
      )}

      <button type="button" onClick={publish} disabled={publishing || !isUmichEmail}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98] disabled:opacity-60">
        {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : 'Review complete — publish listing'}
      </button>
    </div>
  )
}

function Field({ label, badge, children }: { label: string; badge?: SourceLabel; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>
        {label}
        {badge && <Badge label={badge} />}
      </span>
      {children}
    </div>
  )
}
