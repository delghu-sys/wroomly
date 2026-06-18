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
