'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { UPLOAD_LIMITS } from '@/lib/listing-import/schema'
import { compressImageFile, uploadToSignedTargets } from '@/lib/listing-import/client-upload'
import { track } from '@/lib/track'
import { Loader2, Upload, CheckCircle2, AlertCircle, Sparkles, X, FileText, ArrowRight } from 'lucide-react'

// The submit pipeline has real stages now (compress → upload direct to
// storage → AI drafting) — surfaced to the user so a 30–60s import feels
// alive instead of hung. See docs/prelaunch-audit.md items 1 & 5.
type Phase =
  | { name: 'form' }
  | { name: 'compressing'; done: number; total: number }
  | { name: 'uploading'; done: number; total: number }
  | { name: 'drafting' }
  | { name: 'success' }

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'

function filesValid(files: File[]): string | null {
  if (files.length > UPLOAD_LIMITS.maxFiles)
    return `Upload at most ${UPLOAD_LIMITS.maxFiles} files.`
  for (const f of files) {
    if (!(UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(f.type))
      return 'Only JPG, PNG, WebP images, or PDF files are allowed.'
    const isPdf = f.type === 'application/pdf'
    const limit = isPdf ? UPLOAD_LIMITS.maxPdfBytesPerFile : UPLOAD_LIMITS.maxBytesPerFile
    if (f.size > limit)
      return isPdf ? 'Each PDF must be 25MB or smaller.' : 'Each image must be 8MB or smaller.'
  }
  return null
}

const labelCls = 'block text-[13px] font-medium text-ink-soft mb-1.5'
const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-4 focus:ring-[oklch(0.84_0.17_85/0.18)] focus:border-[oklch(0.45_0.13_85)] transition'

export function ImportListingForm() {
  const [phase, setPhase] = useState<Phase>({ name: 'form' })
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
    const str = (k: string) => {
      const v = fd.get(k)
      return typeof v === 'string' && v.trim().length ? v.trim() : undefined
    }

    // Client-side mirror of the key rules (server re-validates).
    const personalText = str('personalPastedText')
    if (!personalText && personalFiles.length === 0) {
      setFieldErrors({ personalPastedText: 'Add at least one photo or screenshot of your place.' })
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

    const email = str('email') ?? ''
    const allFiles = [
      ...personalFiles.map(f => ({ kind: 'personal' as const, file: f })),
      ...buildingFiles.map(f => ({ kind: 'building' as const, file: f })),
    ]
    const startedAt = Date.now()
    track('import_started', { files: allFiles.length, hasText: !!personalText })

    try {
      // 1. Compress images in the browser (phone photos → ~400KB) so the
      //    direct upload is fast on mobile data.
      const compressed: { kind: 'personal' | 'building'; file: File }[] = []
      for (let i = 0; i < allFiles.length; i++) {
        setPhase({ name: 'compressing', done: i, total: allFiles.length })
        compressed.push({ kind: allFiles[i].kind, file: await compressImageFile(allFiles[i].file) })
      }

      // 2. Ask the server for signed upload targets + upload straight to
      //    storage (files never pass through our API).
      let requestId: string | null = null
      let personalPaths: string[] = []
      let buildingPaths: string[] = []
      if (compressed.length > 0) {
        setPhase({ name: 'uploading', done: 0, total: compressed.length })
        const urlRes = await fetch('/api/listing-imports/upload-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            files: compressed.map(c => ({
              kind: c.kind,
              mimeType: c.file.type,
              sizeBytes: c.file.size,
            })),
          }),
        })
        const urlJson = await urlRes.json()
        if (!urlRes.ok || !urlJson.ok) {
          setPhase({ name: 'form' })
          setError(urlJson.error ?? 'Could not start the upload. Please try again.')
          track('import_failed', { stage: 'upload-urls', status: urlRes.status })
          return
        }
        requestId = urlJson.requestId
        const targets: { path: string; token: string }[] = urlJson.targets
        await uploadToSignedTargets(
          compressed.map(c => c.file),
          targets,
          (done, total) => setPhase({ name: 'uploading', done, total }),
        )
        personalPaths = targets.filter((_, i) => compressed[i].kind === 'personal').map(t => t.path)
        buildingPaths = targets.filter((_, i) => compressed[i].kind === 'building').map(t => t.path)
        track('import_upload_done', {
          files: compressed.length,
          secs: Math.round((Date.now() - startedAt) / 1000),
        })
      } else {
        // Text-only import still needs a session row (empty manifest).
        const urlRes = await fetch('/api/listing-imports/upload-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, files: [] }),
        })
        const urlJson = await urlRes.json()
        if (!urlRes.ok || !urlJson.ok) {
          setPhase({ name: 'form' })
          setError(urlJson.error ?? 'Could not start the import. Please try again.')
          track('import_failed', { stage: 'session', status: urlRes.status })
          return
        }
        requestId = urlJson.requestId
      }

      // 3. Finish: send scalars + storage paths; the server verifies the
      //    paths against the bucket, then drafts the listing with AI.
      setPhase({ name: 'drafting' })
      const res = await fetch('/api/listing-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          email,
          personalSourceUrl: str('personalSourceUrl'),
          personalPastedText: personalText,
          personalPaths,
          buildingSourceUrl: str('buildingSourceUrl'),
          buildingPastedText: str('buildingPastedText'),
          buildingPaths,
          buildingName: str('buildingName'),
          floorPlanName: str('floorPlanName'),
          consentConfirmed: fd.get('consentConfirmed') === 'true',
          buildingEnrichmentConsent: fd.get('buildingEnrichmentConsent') === 'true',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setPhase({ name: 'form' })
        if (json.fieldErrors) setFieldErrors(json.fieldErrors)
        setError(json.error ?? 'Something went wrong while creating your draft.')
        track('import_failed', { stage: 'finish', status: res.status })
        return
      }
      track('import_succeeded', { secs: Math.round((Date.now() - startedAt) / 1000) })
      setPhase({ name: 'success' })
    } catch {
      setPhase({ name: 'form' })
      setError('Something went wrong while creating your draft. Please check your connection and try again.')
      track('import_failed', { stage: 'network' })
    }
  }

  if (phase.name === 'success') {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 sm:p-10 text-center">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
          style={{ background: 'oklch(0.55 0.15 142)', color: 'white' }}
        >
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="font-display text-2xl tracking-tight text-ink">Draft received</h2>
        <p className="text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
          Our team is giving it a quick look. Once it’s approved, we’ll email you a
          secure link to review and publish it (usually within a day). Nothing goes
          live until you confirm.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition"
          >
            Browse listings meanwhile <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setPersonalFiles([])
              setBuildingFiles([])
              setPhase({ name: 'form' })
            }}
            className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-line text-ink text-sm font-medium hover:border-[oklch(0.84_0.17_85/0.5)] transition"
          >
            Import another place
          </button>
        </div>
      </div>
    )
  }

  const busy = phase.name !== 'form'
  const busyLabel =
    phase.name === 'compressing'
      ? `Preparing photos… ${Math.min(phase.done + 1, phase.total)}/${phase.total}`
      : phase.name === 'uploading'
        ? `Uploading… ${phase.done}/${phase.total}`
        : phase.name === 'drafting'
          ? 'Drafting your listing with AI… ~20 seconds'
          : ''

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Email */}
      <div>
        <label htmlFor="email" className={labelCls}>Your email</label>
        <input id="email" name="email" type="email" required placeholder="you@email.com" className={inputCls} />
        {fieldErrors.email && <p className="text-xs text-[oklch(0.55_0.20_25)] mt-1">{fieldErrors.email}</p>}
      </div>

      {/* ── PRIMARY: photos + screenshots ── */}
      <section className="rounded-3xl border-2 border-[oklch(0.84_0.17_85/0.45)] bg-surface p-5 sm:p-7 space-y-4 shadow-[0_8px_30px_oklch(0.84_0.17_85/0.10)]">
        <div>
          <h2 className="font-display text-xl tracking-tight text-ink">
            Add photos of your place
          </h2>
          <p className="text-[14px] text-ink-soft mt-1.5 leading-relaxed">
            Upload photos of the room or apartment — plus screenshots of your existing
            post (Facebook, GroupMe, Reddit…) or a PDF of your lease/flyer if you have
            one. That’s all Wroomly needs to draft your listing.
          </p>
        </div>

        <FileField
          label="Photos, screenshots & PDFs"
          files={personalFiles}
          onChange={setPersonalFiles}
          disabled={busy}
          large
        />
        {fieldErrors.personalPastedText && (
          <p className="text-xs text-[oklch(0.55_0.20_25)]">{fieldErrors.personalPastedText}</p>
        )}
      </section>

      {/* ── OPTIONAL: description / existing post ── */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink flex items-center gap-2">
            Add a description
            <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-ink-muted bg-line/60 px-2 py-0.5 rounded-full">Optional</span>
          </h2>
          <p className="text-[13px] text-ink-muted mt-1">
            Paste your existing post or describe the place in your own words. The more
            you add, the more accurate your draft.
          </p>
        </div>

        <div>
          <label htmlFor="personalPastedText" className={labelCls}>Description or pasted post</label>
          <textarea id="personalPastedText" name="personalPastedText" rows={5} maxLength={20000} placeholder="Subletting my room May–Aug, $900/mo, 1 bed in a 4 bed 2 bath near Central. Furnished, utilities included…" className={inputCls} />
        </div>

        <div>
          <label htmlFor="personalSourceUrl" className={labelCls}>Existing post link (optional)</label>
          <input id="personalSourceUrl" name="personalSourceUrl" type="url" placeholder="https://…" className={inputCls} />
        </div>
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
            <input id="buildingName" name="buildingName" type="text" maxLength={120} placeholder="Verve Ann Arbor" className={inputCls} />
          </div>
          <div>
            <label htmlFor="floorPlanName" className={labelCls}>Floor plan name (optional)</label>
            <input id="floorPlanName" name="floorPlanName" type="text" maxLength={120} placeholder="2x2 / B1" className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="buildingSourceUrl" className={labelCls}>Building or floor plan link (optional)</label>
          <input id="buildingSourceUrl" name="buildingSourceUrl" type="url" placeholder="https://…" className={inputCls} />
        </div>

        <div>
          <label htmlFor="buildingPastedText" className={labelCls}>Paste building or floor plan details (optional)</label>
          <textarea id="buildingPastedText" name="buildingPastedText" rows={4} maxLength={20000} placeholder="Amenities, layout, square footage…" className={inputCls} />
        </div>

        <FileField
          label="Upload building or floor plan screenshots (optional)"
          files={buildingFiles}
          onChange={setBuildingFiles}
          disabled={busy}
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
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {busyLabel}</>
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

/** Object-URL thumbnail that revokes itself on unmount. */
function Thumb({ file }: { file: File }) {
  const url = useMemo(
    () => (file.type === 'application/pdf' ? null : URL.createObjectURL(file)),
    [file],
  )
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  if (file.type === 'application/pdf') {
    return (
      <span className="w-full h-full flex flex-col items-center justify-center gap-1 bg-white text-ink-muted">
        <FileText className="w-5 h-5" />
        <span className="text-[9px] px-1 truncate max-w-full">{file.name}</span>
      </span>
    )
  }
  // Plain <img> for local object URLs (next/image can't optimize blob: urls).
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={file.name} className="w-full h-full object-cover" /> : null
}

function FileField({
  label,
  files,
  onChange,
  disabled = false,
  large = false,
}: {
  label: string
  files: File[]
  onChange: (f: File[]) => void
  disabled?: boolean
  large?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Append (mobile users pick from the camera roll in batches) + dedupe.
  function addFiles(picked: File[]) {
    const merged = [...files]
    for (const f of picked) {
      if (!merged.some(m => m.name === f.name && m.size === f.size)) merged.push(f)
    }
    onChange(merged.slice(0, UPLOAD_LIMITS.maxFiles))
    // Allow re-picking the same file after a remove.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {!large && <span className={labelCls}>{label}</span>}
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
          large
            ? 'border-[oklch(0.84_0.17_85/0.5)] hover:border-[oklch(0.84_0.17_85/0.8)] bg-[oklch(0.84_0.17_85/0.05)] px-4 py-10'
            : 'border-line hover:border-[oklch(0.84_0.17_85/0.5)] bg-white/60 px-4 py-6'
        }`}
      >
        <Upload className={large ? 'w-8 h-8 text-[oklch(0.45_0.13_85)]' : 'w-5 h-5 text-ink-muted'} />
        <span className={large ? 'text-[15px] font-medium text-ink' : 'text-[13px] text-ink-soft'}>
          {files.length > 0
            ? `${files.length} file${files.length === 1 ? '' : 's'} added — tap to add more`
            : large
              ? 'Tap to add photos, screenshots & PDFs'
              : 'Tap to choose files'}
        </span>
        <span className="text-[11px] text-ink-muted">JPG, PNG, WebP, PDF · up to 10 · images 8MB, PDFs 25MB</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled}
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${f.size}`} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-white">
              <Thumb file={f} />
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[oklch(0.22_0.075_256/0.85)] text-white flex items-center justify-center hover:bg-[oklch(0.22_0.075_256)] transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
