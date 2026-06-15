'use client'

import { useState } from 'react'
import { UPLOAD_LIMITS } from '@/lib/listing-import/schema'
import { Loader2, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

type Phase = 'form' | 'submitting' | 'success'

const ACCEPT = '.jpg,.jpeg,.png,.webp'

function filesValid(files: File[]): string | null {
  if (files.length > UPLOAD_LIMITS.maxFiles)
    return `Upload at most ${UPLOAD_LIMITS.maxFiles} files.`
  for (const f of files) {
    if (!(UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(f.type))
      return 'Only JPG, PNG, and WebP images are allowed.'
    if (f.size > UPLOAD_LIMITS.maxBytesPerFile) return 'Each image must be 8MB or smaller.'
  }
  return null
}

const labelCls = 'block text-[13px] font-medium text-ink-soft mb-1.5'
const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-4 focus:ring-[oklch(0.84_0.17_85/0.18)] focus:border-[oklch(0.45_0.13_85)] transition'

export function ImportListingForm() {
  const [phase, setPhase] = useState<Phase>('form')
  const [personalFiles, setPersonalFiles] = useState<File[]>([])
  const [buildingFiles, setBuildingFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const form = e.currentTarget
    const fd = new FormData(form)

    // Client-side mirror of the key rules (server re-validates).
    const personalText = (fd.get('personalPastedText') as string)?.trim()
    if (!personalText && personalFiles.length === 0) {
      setFieldErrors({ personalPastedText: 'Paste your post or upload at least one screenshot.' })
      return
    }
    if (fd.get('consentConfirmed') !== 'true') {
      setFieldErrors({ consentConfirmed: 'Please confirm this is your listing.' })
      return
    }
    const pErr = filesValid(personalFiles)
    if (pErr) return setError(pErr)
    const bErr = filesValid(buildingFiles)
    if (bErr) return setError(bErr)

    // Files aren't in FormData from the controlled inputs — append manually.
    fd.delete('personalImages')
    fd.delete('buildingImages')
    personalFiles.forEach(f => fd.append('personalImages', f))
    buildingFiles.forEach(f => fd.append('buildingImages', f))

    setPhase('submitting')
    try {
      const res = await fetch('/api/listing-imports', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setPhase('form')
        if (json.fieldErrors) setFieldErrors(json.fieldErrors)
        setError(json.error ?? 'Something went wrong while creating your draft.')
        return
      }
      setPhase('success')
    } catch {
      setPhase('form')
      setError('Something went wrong while creating your draft. Please try again.')
    }
  }

  if (phase === 'success') {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 sm:p-10 text-center">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
          style={{ background: 'oklch(0.55 0.15 142)', color: 'white' }}
        >
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="font-display text-2xl tracking-tight text-ink">Your draft is ready</h2>
        <p className="text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
          We emailed you a secure link to review and publish it. Nothing goes live
          until you confirm. Check your inbox (and spam, just in case).
        </p>
      </div>
    )
  }

  const submitting = phase === 'submitting'

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Email */}
      <div>
        <label htmlFor="email" className={labelCls}>Your email</label>
        <input id="email" name="email" type="email" required placeholder="you@umich.edu" className={inputCls} />
        {fieldErrors.email && <p className="text-xs text-[oklch(0.55_0.20_25)] mt-1">{fieldErrors.email}</p>}
      </div>

      {/* ── Personal source section ── */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">Your existing sublet post</h2>
          <p className="text-[13px] text-ink-muted mt-1">
            Paste your Facebook, GroupMe, Reddit, Craigslist, or other sublet post — or upload screenshots.
          </p>
        </div>

        <div>
          <label htmlFor="personalSourceUrl" className={labelCls}>Existing sublet post link (optional)</label>
          <input id="personalSourceUrl" name="personalSourceUrl" type="url" placeholder="https://…" className={inputCls} />
        </div>

        <div>
          <label htmlFor="personalPastedText" className={labelCls}>Paste your sublet post</label>
          <textarea id="personalPastedText" name="personalPastedText" rows={6} placeholder="Subletting my room May–Aug, $900/mo, 1 bed in a 4 bed 2 bath near Central…" className={inputCls} />
          {fieldErrors.personalPastedText && <p className="text-xs text-[oklch(0.55_0.20_25)] mt-1">{fieldErrors.personalPastedText}</p>}
        </div>

        <FileField
          label="Upload screenshots or photos of your sublet post"
          files={personalFiles}
          onChange={setPersonalFiles}
        />
      </section>

      {/* ── Building enrichment section ── */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">Add building or floor plan details</h2>
          <p className="text-[13px] text-ink-muted mt-1">
            Have a Verve, Hub, Vic Village, Six11, Landmark, or Foundry page? Paste the building or floor plan
            link so Wroomly can add factual details like amenities, layout, and campus proximity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="buildingName" className={labelCls}>Building name (optional)</label>
            <input id="buildingName" name="buildingName" type="text" placeholder="Verve Ann Arbor" className={inputCls} />
          </div>
          <div>
            <label htmlFor="floorPlanName" className={labelCls}>Floor plan name (optional)</label>
            <input id="floorPlanName" name="floorPlanName" type="text" placeholder="2x2 / B1" className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="buildingSourceUrl" className={labelCls}>Building or floor plan link (optional)</label>
          <input id="buildingSourceUrl" name="buildingSourceUrl" type="url" placeholder="https://…" className={inputCls} />
        </div>

        <div>
          <label htmlFor="buildingPastedText" className={labelCls}>Paste building or floor plan details (optional)</label>
          <textarea id="buildingPastedText" name="buildingPastedText" rows={4} placeholder="Amenities, layout, square footage…" className={inputCls} />
        </div>

        <FileField
          label="Upload building or floor plan screenshots (optional)"
          files={buildingFiles}
          onChange={setBuildingFiles}
        />

        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
          <input type="checkbox" name="buildingEnrichmentConsent" value="true" className="mt-0.5 h-4 w-4 accent-[oklch(0.45_0.13_85)]" />
          <span>I understand that building/floor plan details are used only to enrich the draft, and that I must confirm they apply to my specific unit before publishing.</span>
        </label>
        {fieldErrors.buildingEnrichmentConsent && <p className="text-xs text-[oklch(0.55_0.20_25)]">{fieldErrors.buildingEnrichmentConsent}</p>}
      </section>

      {/* Consent */}
      <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
        <input type="checkbox" name="consentConfirmed" value="true" className="mt-0.5 h-4 w-4 accent-[oklch(0.45_0.13_85)]" />
        <span>I confirm this is my listing or I have permission to import it.</span>
      </label>
      {fieldErrors.consentConfirmed && <p className="text-xs text-[oklch(0.55_0.20_25)]">{fieldErrors.consentConfirmed}</p>}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-[oklch(0.85_0.10_25)] bg-[oklch(0.97_0.04_25)] px-4 py-3 text-[13px] text-[oklch(0.45_0.18_25)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creating your draft listing…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Create my Wroomly draft</>
        )}
      </button>
      <p className="text-[12px] text-ink-muted text-center -mt-4">
        AI can make mistakes — you’ll review everything before anything goes live.
      </p>
    </form>
  )
}

function FileField({
  label,
  files,
  onChange,
}: {
  label: string
  files: File[]
  onChange: (f: File[]) => void
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line hover:border-[oklch(0.84_0.17_85/0.5)] bg-white/60 px-4 py-6 cursor-pointer transition">
        <Upload className="w-5 h-5 text-ink-muted" />
        <span className="text-[13px] text-ink-soft">
          {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Click to choose images'}
        </span>
        <span className="text-[11px] text-ink-muted">JPG, PNG, WebP · up to 10 · 8MB each</span>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={e => onChange(Array.from(e.target.files ?? []))}
        />
      </label>
    </div>
  )
}
