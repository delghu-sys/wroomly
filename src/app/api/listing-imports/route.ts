import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { importInputSchema } from '@/lib/listing-import/schema'
import { uploadImportImages, UploadError } from '@/lib/listing-import/uploads'
import { extractListingDraft } from '@/lib/ai/listing-importer'
import {
  generateClaimToken,
  hashClaimToken,
  claimTokenExpiry,
} from '@/lib/listing-import/claim-token'
import { sendEmail } from '@/lib/email/send'
import { listingImportClaimEmail } from '@/lib/email/templates'
import type { ListingImportInput } from '@/types/listing-import'

export const runtime = 'nodejs'
export const maxDuration = 60 // AI extraction can take a few seconds

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
const RATE_LIMIT_PER_HOUR = 5

function str(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length ? t : undefined
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 })
  }

  const personalFiles = form.getAll('personalImages').filter((f): f is File => f instanceof File)
  const buildingFiles = form.getAll('buildingImages').filter((f): f is File => f instanceof File)

  // Validate scalar fields + cross-field rules.
  const parsed = importInputSchema.safeParse({
    email: str(form.get('email')) ?? '',
    personalSourceUrl: str(form.get('personalSourceUrl')),
    personalPastedText: str(form.get('personalPastedText')),
    personalImageCount: personalFiles.length,
    buildingSourceUrl: str(form.get('buildingSourceUrl')),
    buildingPastedText: str(form.get('buildingPastedText')),
    buildingImageCount: buildingFiles.length,
    buildingName: str(form.get('buildingName')),
    floorPlanName: str(form.get('floorPlanName')),
    consentConfirmed: form.get('consentConfirmed') === 'true',
    buildingEnrichmentConsent: form.get('buildingEnrichmentConsent') === 'true',
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return NextResponse.json({ error: 'Please fix the form.', fieldErrors }, { status: 400 })
  }
  const input = parsed.data

  const service = createServiceClient()

  // Lightweight rate limit: cap imports per email per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await service
    .from('listing_import_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', input.email)
    .gte('created_at', oneHourAgo)
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many imports from this email. Please try again later.' },
      { status: 429 },
    )
  }

  // 1. Create the request row (pending) to get an id for upload paths.
  const { data: created, error: insertErr } = await service
    .from('listing_import_requests')
    .insert({
      email: input.email,
      personal_source_url: input.personalSourceUrl ?? null,
      personal_pasted_text: input.personalPastedText ?? null,
      building_source_url: input.buildingSourceUrl ?? null,
      building_pasted_text: input.buildingPastedText ?? null,
      building_name: input.buildingName ?? null,
      floor_plan_name: input.floorPlanName ?? null,
      consent_confirmed: input.consentConfirmed,
      building_enrichment_consent: input.buildingEnrichmentConsent,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !created) {
    console.error('[listing-imports] insert failed', insertErr)
    return NextResponse.json({ error: 'Could not start the import. Please try again.' }, { status: 500 })
  }
  const requestId = created.id as string
  console.info('[listing-imports] request created', { requestId, email: input.email })

  // 2. Upload images.
  let personalImages, buildingImages
  try {
    await service.from('listing_import_requests').update({ status: 'processing' }).eq('id', requestId)
    personalImages = await uploadImportImages(personalFiles, { requestId, kind: 'personal' })
    buildingImages = await uploadImportImages(buildingFiles, { requestId, kind: 'building' })
    console.info('[listing-imports] uploaded', {
      requestId,
      personal: personalImages.length,
      building: buildingImages.length,
    })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Upload failed. Please try again.'
    await service
      .from('listing_import_requests')
      .update({ status: 'failed', error_message: message })
      .eq('id', requestId)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 3. Run AI extraction.
  console.info('[listing-imports] AI extraction started', { requestId })
  const aiInput: ListingImportInput = {
    email: input.email,
    personalSourceUrl: input.personalSourceUrl,
    personalPastedText: input.personalPastedText,
    personalImageUrls: personalImages.map(i => i.url),
    buildingSourceUrl: input.buildingSourceUrl,
    buildingPastedText: input.buildingPastedText,
    buildingImageUrls: buildingImages.map(i => i.url),
    buildingName: input.buildingName,
    floorPlanName: input.floorPlanName,
  }

  const extraction = await extractListingDraft(aiInput)
  if (!extraction.ok) {
    await service
      .from('listing_import_requests')
      .update({ status: 'failed', error_message: extraction.error })
      .eq('id', requestId)
    return NextResponse.json({ error: extraction.error }, { status: 502 })
  }
  console.info('[listing-imports] AI extraction completed', {
    requestId,
    confidence: extraction.draft.confidence.overall,
    conflicts: extraction.draft.conflictsBetweenSources.length,
  })

  // 4. Mint claim token + persist everything.
  const rawToken = generateClaimToken()
  const { error: finalizeErr } = await service
    .from('listing_import_requests')
    .update({
      status: 'completed',
      extracted_data: extraction.draft,
      personal_image_paths: personalImages.map(i => i.path),
      building_image_paths: buildingImages.map(i => i.path),
      claim_token_hash: hashClaimToken(rawToken),
      claim_token_expires_at: claimTokenExpiry().toISOString(),
    })
    .eq('id', requestId)

  if (finalizeErr) {
    console.error('[listing-imports] finalize failed', finalizeErr)
    return NextResponse.json({ error: 'Could not save the draft. Please try again.' }, { status: 500 })
  }
  console.info('[listing-imports] draft created', { requestId })

  // 5. Email the magic link. Never log the raw token.
  const claimUrl = `${APP_URL}/claim-listing/${rawToken}`
  const { subject, html } = listingImportClaimEmail({
    claimUrl,
    listingTitle: extraction.draft.title,
  })
  const emailResult = await sendEmail({ to: input.email, subject, html })
  if (!emailResult.ok) {
    // Draft is saved; only the email failed. Surface it so the user knows.
    console.error('[listing-imports] claim email failed', { requestId })
    return NextResponse.json(
      { ok: false, error: 'Your draft was created, but we couldn’t send the email. Please contact help@wroomly.app.' },
      { status: 502 },
    )
  }
  console.info('[listing-imports] claim email sent', { requestId })

  return NextResponse.json({ ok: true })
}
