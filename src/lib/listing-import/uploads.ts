import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { getListingImageUrl } from '@/lib/utils/listing'
import { UPLOAD_LIMITS } from './schema'

const BUCKET = 'listing-images'

export interface UploadedImage {
  path: string // storage path within the bucket
  url: string // public URL (for AI + preview)
}

export class UploadError extends Error {}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Validate + upload a set of visitor-submitted image Files to storage under
 * imports/<requestId>/<kind>/. Uses the service client (the visitor is
 * unauthenticated). Returns storage paths + public URLs.
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
      throw new UploadError('Only JPG, PNG, and WebP images are allowed.')
    }
    if (file.size > UPLOAD_LIMITS.maxBytesPerFile) {
      throw new UploadError('Each image must be 8MB or smaller.')
    }

    const ext = EXT_BY_MIME[file.type] ?? 'jpg'
    // Server-generated path — never trust the client filename.
    const path = `imports/${opts.requestId}/${opts.kind}/${i}.${ext}`

    const { error } = await service.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      console.error('[listing-import upload] failed', { path, error: error.message })
      throw new UploadError('Could not upload an image. Please try again.')
    }

    out.push({ path, url: getListingImageUrl(path) })
  }

  return out
}
