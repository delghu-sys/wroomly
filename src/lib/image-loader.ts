'use client'

/**
 * next/image loader: photos in Supabase's PUBLIC buckets are served through
 * Supabase Image Transformations, resized to the width the browser asked for
 * (and auto-converted to WebP when the browser accepts it). A ~300KB 1600px
 * listing photo shown in a ~400px card becomes ~30–80KB.
 *
 * Why not Vercel's optimizer: its monthly quota returns HTTP 402 once spent,
 * which broke every image site-wide (see next.config.ts). Supabase bills $5
 * per 1,000 distinct source images per month (first 100 included on Pro).
 * If the transform endpoint ever fails, StorageImage falls back to the
 * original file, so a quota problem makes photos slower — never missing.
 *
 * Everything else (local /public files, signed private URLs, blob previews)
 * is returned untouched.
 */

const PUBLIC_OBJECT = '/storage/v1/object/public/'
const RENDER_PUBLIC = '/storage/v1/render/image/public/'
const MAX_WIDTH = 2500 // Supabase's transform limit

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const at = src.indexOf(PUBLIC_OBJECT)
  if (at === -1 || !src.startsWith('https://')) return src

  const url = new URL(src.slice(0, at) + RENDER_PUBLIC + src.slice(at + PUBLIC_OBJECT.length))
  url.searchParams.set('width', String(Math.min(width, MAX_WIDTH)))
  url.searchParams.set('quality', String(quality ?? 75))
  // Width-only + the default `cover` mode CROPS to the original height
  // (an 800×600 photo at width=640 came back 640×600). `contain` scales
  // proportionally and never upscales.
  url.searchParams.set('resize', 'contain')
  return url.href
}
