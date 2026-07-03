'use client'

import { createClient } from '@/lib/supabase/client'

// Client half of the two-phase import upload (see /api/listing-imports/upload-urls).
// Photos are downscaled in the browser before upload: a 4MB phone photo
// becomes ~300–500KB, which is what makes "import finishes in under a minute
// on campus LTE" true. PDFs pass through untouched.

const MAX_DIMENSION = 1600 // px, longest side — plenty for listing photos
const JPEG_QUALITY = 0.82
const SKIP_BELOW_BYTES = 700 * 1024 // already small enough — don't re-encode

export async function compressImageFile(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file
  if (file.size <= SKIP_BELOW_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    // JPEG for universal encode support (Safari can't reliably encode WebP).
    // Screenshots lose their PNG-ness, which is fine for listing photos.
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file // re-encode didn't help
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    // Decode failure (exotic format) — upload the original; the server-side
    // limits still apply.
    return file
  }
}

export interface UploadTarget {
  path: string
  token: string
}

const IMPORTS_BUCKET = 'listing-imports'
const PARALLEL = 3

/**
 * PUT files straight into the private imports bucket using single-use signed
 * upload tokens — never through our API (Vercel's ~4.5MB body cap). `targets`
 * must be aligned 1:1 with `files`. Calls `onProgress(done, total)` as files
 * complete. Throws on the first failure.
 */
export async function uploadToSignedTargets(
  files: File[],
  targets: UploadTarget[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (files.length !== targets.length) throw new Error('Upload mismatch.')
  const supabase = createClient()
  let done = 0
  let cursor = 0

  async function worker() {
    while (cursor < files.length) {
      const i = cursor++
      const { error } = await supabase.storage
        .from(IMPORTS_BUCKET)
        .uploadToSignedUrl(targets[i].path, targets[i].token, files[i], {
          contentType: files[i].type,
        })
      if (error) throw new Error(error.message)
      done++
      onProgress?.(done, files.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker))
}
