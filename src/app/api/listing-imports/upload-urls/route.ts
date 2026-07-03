import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadRequestSchema } from '@/lib/listing-import/schema'
import { createSignedUploadTargets, UploadError } from '@/lib/listing-import/uploads'

export const runtime = 'nodejs'

// Rate limits live HERE (row creation), not on /finish: every import attempt
// creates exactly one pending row, and /finish only runs once per row (atomic
// pending → processing transition), so capping rows caps total AI + storage
// cost. Per-email is bypassable by rotating emails; the global cap bounds the
// blast radius. Deliberately NOT per-IP — UMich students share the campus NAT.
const RATE_LIMIT_PER_HOUR = 8
const GLOBAL_RATE_LIMIT_PER_HOUR = 60

/**
 * POST /api/listing-imports/upload-urls
 *
 * Phase 1 of the two-phase import: validates the file manifest, creates the
 * pending import-request row, and mints single-use signed upload URLs so the
 * browser can PUT each file straight into the private imports bucket. Files
 * never pass through this function — Vercel caps request bodies at ~4.5MB,
 * which two phone photos exceed (the old single-request flow 413'd).
 *
 * Body: { email, files: [{ kind, mimeType, sizeBytes }] }
 * → { requestId, targets: [{ path, token }] }  (aligned with `files` order)
 */
export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const parsed = uploadRequestSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Please fix the upload.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const { email, files } = parsed.data

  const service = createServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await service
    .from('listing_import_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo)
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many imports from this email. Please try again later.' },
      { status: 429 },
    )
  }

  const { count: globalCount } = await service
    .from('listing_import_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo)
  if ((globalCount ?? 0) >= GLOBAL_RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'We’re processing a lot of imports right now. Please try again in a little while.' },
      { status: 429 },
    )
  }

  const { data: created, error: insertErr } = await service
    .from('listing_import_requests')
    .insert({ email, status: 'pending', consent_confirmed: false })
    .select('id')
    .single()
  if (insertErr || !created) {
    console.error('[listing-imports/upload-urls] insert failed', insertErr)
    return NextResponse.json({ error: 'Could not start the import. Please try again.' }, { status: 500 })
  }
  const requestId = created.id as string

  try {
    const targets = await createSignedUploadTargets(requestId, files)
    console.info('[listing-imports/upload-urls] minted', { requestId, files: files.length })
    return NextResponse.json({ ok: true, requestId, targets })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Could not prepare the upload.'
    await service
      .from('listing_import_requests')
      .update({ status: 'failed', error_message: message })
      .eq('id', requestId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
