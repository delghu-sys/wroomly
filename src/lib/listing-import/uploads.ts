import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { UPLOAD_LIMITS } from './schema'

// PRIVATE bucket for AI-import SOURCE files (screenshots, lease PDFs, flyers).
// These can contain personal info, so — unlike published listing photos — they
// are never world-readable. Access is server-side via the service role only;
// the browser and the AI receive short-lived SIGNED urls. See migration 017.
const IMPORTS_BUCKET = 'listing-imports'
// PUBLIC bucket where chosen photos are copied at publish time for display.
const PUBLIC_BUCKET = 'listing-images'
// Long enough to cover the AI extraction call plus a normal review session.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2 // 2 hours

export interface UploadedImage {
  path: string // storage path within the private imports bucket
  url: string // short-lived SIGNED url (private bucket is not public-readable)
}

export class UploadError extends Error {}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/**
 * Validate + upload a set of visitor-submitted Files to the PRIVATE imports
 * bucket under imports/<requestId>/<kind>/. Uses the service client (the
 * visitor is unauthenticated). Returns storage paths + short-lived signed URLs.
 *
 * Throws UploadError with a user-safe message on validation/upload failure
 * so the import route can surface it cleanly.
 */
export async function uploadImportImages(
  files: File[],
  opts: { requestId: string; kind: 'personal' | 'building' },
): Promise<UploadedImage[]> {
  if (files.length === 0) return []
  if (files.length > UPLOAD_LIMITS.maxFiles) {
    throw new UploadError(`Too many files — upload at most ${UPLOAD_LIMITS.maxFiles}.`)
  }

  const service = createServiceClient()
  const out: UploadedImage[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (!(UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(file.type)) {
      throw new UploadError('Only JPG, PNG, WebP images, or PDF files are allowed.')
    }
    const isPdf = file.type === 'application/pdf'
    const sizeLimit = isPdf ? UPLOAD_LIMITS.maxPdfBytesPerFile : UPLOAD_LIMITS.maxBytesPerFile
    if (file.size > sizeLimit) {
      throw new UploadError(
        isPdf ? 'Each PDF must be 25MB or smaller.' : 'Each image must be 8MB or smaller.',
      )
    }

    const ext = EXT_BY_MIME[file.type] ?? 'jpg'
    // Server-generated path — never trust the client filename. Timestamp
    // prefix keeps later review-time additions from overwriting the originals.
    const path = `imports/${opts.requestId}/${opts.kind}/${Date.now()}-${i}.${ext}`

    const { error } = await service.storage
      .from(IMPORTS_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      console.error('[listing-import upload] failed', { path, error: error.message })
      throw new UploadError('Could not upload an image. Please try again.')
    }

    const { data: signed } = await service.storage
      .from(IMPORTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    out.push({ path, url: signed?.signedUrl ?? '' })
  }

  return out
}

export interface SignedUploadTarget {
  path: string
  token: string
}

/**
 * Mint signed UPLOAD urls so the browser can PUT files straight into the
 * private imports bucket — bypassing our API routes entirely (Vercel caps
 * request bodies at ~4.5MB, which two phone photos exceed). The token is
 * single-use and scoped to exactly one server-generated path, so the client
 * can never write outside imports/<requestId>/<kind>/.
 */
export async function createSignedUploadTargets(
  requestId: string,
  files: { kind: 'personal' | 'building'; mimeType: string }[],
): Promise<SignedUploadTarget[]> {
  const service = createServiceClient()
  const out: SignedUploadTarget[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const ext = EXT_BY_MIME[f.mimeType] ?? 'jpg'
    const path = `imports/${requestId}/${f.kind}/${Date.now()}-${i}.${ext}`
    const { data, error } = await service.storage
      .from(IMPORTS_BUCKET)
      .createSignedUploadUrl(path)
    if (error || !data?.token) {
      console.error('[listing-import upload-urls] mint failed', { path, error: error?.message })
      throw new UploadError('Could not prepare the upload. Please try again.')
    }
    out.push({ path, token: data.token })
  }
  return out
}

/**
 * Verify client-claimed storage paths after a direct upload: every path must
 * live under this request's prefix for the given kind, actually exist in the
 * bucket, and respect the size/type limits. Returns the verified paths
 * (order preserved). Never trusts the client's word for any of it.
 */
export async function verifyUploadedPaths(
  requestId: string,
  paths: string[],
  kind: 'personal' | 'building',
  opts: { imagesOnly?: boolean } = {},
): Promise<string[]> {
  if (paths.length === 0) return []
  if (paths.length > UPLOAD_LIMITS.maxFiles) {
    throw new UploadError(`Too many files — upload at most ${UPLOAD_LIMITS.maxFiles}.`)
  }
  const prefix = `imports/${requestId}/${kind}/`
  for (const p of paths) {
    if (!p.startsWith(prefix) || p.includes('..')) {
      throw new UploadError('Invalid file reference.')
    }
  }

  const service = createServiceClient()
  // list() takes the folder path (no trailing slash) and returns direct children.
  const { data: entries, error } = await service.storage
    .from(IMPORTS_BUCKET)
    .list(prefix.slice(0, -1), { limit: 100 })
  if (error) {
    console.error('[listing-import verify] list failed', { prefix, error: error.message })
    throw new UploadError('Could not verify the uploaded files. Please try again.')
  }
  const byName = new Map(
    (entries ?? []).map(e => [e.name, e.metadata as { size?: number; mimetype?: string } | null]),
  )

  for (const p of paths) {
    const name = p.slice(prefix.length)
    const meta = byName.get(name)
    if (meta === undefined) {
      throw new UploadError('An uploaded file is missing — please re-upload and try again.')
    }
    const mime = meta?.mimetype ?? ''
    const size = meta?.size ?? 0
    if (!(UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(mime)) {
      throw new UploadError('Only JPG, PNG, WebP images, or PDF files are allowed.')
    }
    if (opts.imagesOnly && mime === 'application/pdf') {
      throw new UploadError('Listing photos must be images (JPG, PNG, or WebP), not PDFs.')
    }
    const limit =
      mime === 'application/pdf' ? UPLOAD_LIMITS.maxPdfBytesPerFile : UPLOAD_LIMITS.maxBytesPerFile
    if (size <= 0 || size > limit) {
      throw new UploadError(
        mime === 'application/pdf'
          ? 'Each PDF must be 25MB or smaller.'
          : 'Each image must be 8MB or smaller.',
      )
    }
  }
  return paths
}

/**
 * Mint short-lived signed URLs for a set of private import paths, returned as
 * a { path → signedUrl } map. Used by the admin-review and claim pages (which
 * render server-side) to display source files without exposing them publicly.
 */
export async function signImportUrls(
  paths: string[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(IMPORTS_BUCKET)
    .createSignedUrls(paths, ttlSeconds)
  if (error) {
    console.error('[listing-import sign] failed', error.message)
    return {}
  }
  const map: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl
  }
  return map
}

/**
 * Copy a chosen photo out of the PRIVATE imports bucket into the PUBLIC
 * listing-images bucket (same path) so the published listing can display it.
 * Returns true on success. Idempotent-ish: a duplicate target is treated as
 * success so a retried publish doesn't fail.
 */
export async function copyImportFileToPublic(path: string): Promise<boolean> {
  const service = createServiceClient()
  const { error } = await service.storage
    .from(IMPORTS_BUCKET)
    .copy(path, path, { destinationBucket: PUBLIC_BUCKET })
  if (error) {
    // "already exists" (duplicate) means a prior publish already copied it.
    if (/exist/i.test(error.message)) return true
    console.error('[listing-import copy→public] failed', { path, error: error.message })
    return false
  }
  return true
}
