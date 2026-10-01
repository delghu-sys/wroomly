import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Copying the photos from someone's original post into their PRIVATE draft.
 *
 * DECISION, 2026-10-01 (Hugo): drafts used to carry no photos at all — "we
 * never copy anyone's photos" was one of the conditions that made scraping
 * defensible. Claimers then had to re-upload pictures their post already had,
 * and it was the single biggest gap between a draft and a publishable listing.
 *
 * What makes the reversal defensible is WHERE they go, which is unchanged
 * infrastructure: the private `listing-imports` bucket, exactly where the AI
 * importer keeps a person's own uploads. Nothing here is public. A photo
 * reaches the public `listing-images` bucket only when the claimer publishes
 * with it selected — the publish route's existing private-to-public copy. The
 * draft also tells them the photos came from their post and to untick any
 * that aren't theirs: some posts carry a building's marketing shots.
 *
 * No `server-only` import: this runs inside runDraft, which the CLI calls
 * under raw Node as well as the admin console.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, 'public', any>

/** Must match IMPORTS_BUCKET in src/lib/listing-import/uploads.ts. */
export const IMPORTS_BUCKET = 'listing-imports'

/** Enough for a listing; a post with 40 images is not 40 useful photos. */
export const MAX_SOURCE_PHOTOS = 8

/** Matches the importer's own per-image limit, and sits under the public
 *  bucket's 10MB cap so a photo that copies privately can still publish. */
export const MAX_SOURCE_PHOTO_BYTES = 8 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const UA = 'WroomlyBot/1.0 (+https://wroomly.app)'

/**
 * `wix:image://v1/<mediaId>/<filename>#…` → the CDN URL that serves it.
 * Anything not in that shape is ignored rather than guessed at.
 */
export function wixImageUrl(ref: string): string | null {
  const m = /^wix:image:\/\/v1\/([A-Za-z0-9_]+~mv2\.(?:jpe?g|png|webp))(?:\/|#|$)/i.exec(ref.trim())
  return m ? `https://static.wixstatic.com/media/${m[1]}` : null
}

export interface CopyResult {
  /** Storage paths in the private bucket, ready for personal_image_paths. */
  paths: string[]
  /** Images skipped: wrong type, too big, or the fetch/upload failed. */
  skipped: number
}

/**
 * Download each image and store it privately under the draft's request id,
 * using the same path shape the importer uses for a person's own uploads
 * (`imports/<requestId>/personal/…`). Never throws: a draft without photos is
 * still a useful draft, so a failure here costs a photo, not the lead.
 */
export async function copySourcePhotos(
  db: Db,
  requestId: string,
  urls: string[],
  { fetchImpl = fetch }: { fetchImpl?: typeof fetch } = {},
): Promise<CopyResult> {
  const out: CopyResult = { paths: [], skipped: 0 }
  const unique = [...new Set(urls)].slice(0, MAX_SOURCE_PHOTOS)

  for (let i = 0; i < unique.length; i++) {
    try {
      const res = await fetchImpl(unique[i], { headers: { 'User-Agent': UA } })
      if (!res.ok) { out.skipped += 1; continue }

      const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      const ext = EXT_BY_MIME[mime]
      // Type comes from what the server actually sent, never from the URL.
      if (!ext) { out.skipped += 1; continue }

      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_PHOTO_BYTES) {
        out.skipped += 1
        continue
      }

      const path = `imports/${requestId}/personal/${Date.now()}-${i}.${ext}`
      const { error } = await db.storage
        .from(IMPORTS_BUCKET)
        .upload(path, bytes, { contentType: mime, upsert: true })
      if (error) { out.skipped += 1; continue }
      out.paths.push(path)
    } catch {
      out.skipped += 1
    }
  }
  return out
}
