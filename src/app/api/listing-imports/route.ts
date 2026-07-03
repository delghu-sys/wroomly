import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { importFinishSchema, importInputSchema } from '@/lib/listing-import/schema'
import { verifyUploadedPaths, signImportUrls, UploadError } from '@/lib/listing-import/uploads'
import { extractListingDraft } from '@/lib/ai/listing-importer'
import { sendEmail } from '@/lib/email/send'
import { importReviewAdminEmail } from '@/lib/email/templates'
import { getAdminEmails } from '@/lib/listing-import/admins'
import type { ListingImportInput } from '@/types/listing-import'

export const runtime = 'nodejs'
export const maxDuration = 60 // AI extraction can take a while on many photos

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
// A pending row must be finished within this window (upload targets are
// minted alongside it and expire on the same scale).
const PENDING_MAX_AGE_MS = 2 * 60 * 60 * 1000

/**
 * POST /api/listing-imports
 *
 * Phase 2 of the two-phase import (see ./upload-urls for phase 1): the
 * browser has already PUT its files straight into the private bucket; this
 * endpoint receives JSON — scalars + the storage paths — verifies every path
 * against storage (existence, prefix, size, type), then runs the AI
 * extraction and hands the draft to admin review.
 *
 * Rate limiting happens at /upload-urls (row creation). This endpoint is
 * single-shot per row via an atomic pending → processing transition, so it
 * can't be replayed to multiply AI cost.
 */
export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsedFinish = importFinishSchema.safeParse(raw)
  if (!parsedFinish.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsedFinish.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return NextResponse.json({ error: 'Please fix the form.', fieldErrors }, { status: 400 })
  }
  const input = parsedFinish.data

  // Re-run the cross-field rules (consent, "text OR images", enrichment
  // consent) through the canonical input schema so the two-phase flow can't
  // skip them.
  const crossCheck = importInputSchema.safeParse({
    email: input.email,
    personalSourceUrl: input.personalSourceUrl,
    personalPastedText: input.personalPastedText,
    personalImageCount: input.personalPaths.length,
    buildingSourceUrl: input.buildingSourceUrl,
    buildingPastedText: input.buildingPastedText,
    buildingImageCount: input.buildingPaths.length,
    buildingName: input.buildingName,
    floorPlanName: input.floorPlanName,
    consentConfirmed: input.consentConfirmed,
    buildingEnrichmentConsent: input.buildingEnrichmentConsent,
  })
  if (!crossCheck.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of crossCheck.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return NextResponse.json({ error: 'Please fix the form.', fieldErrors }, { status: 400 })
  }

  const service = createServiceClient()

  // The row must exist, belong to this email, still be pending, and be fresh.
  const { data: req } = await service
    .from('listing_import_requests')
    .select('id, email, status, created_at')
    .eq('id', input.requestId)
    .maybeSingle()
  if (!req || req.email !== input.email || req.status !== 'pending') {
    return NextResponse.json({ error: 'This import session is no longer valid. Please start again.' }, { status: 409 })
  }
  if (Date.now() - new Date(req.created_at).getTime() > PENDING_MAX_AGE_MS) {
    await service
      .from('listing_import_requests')
      .update({ status: 'failed', error_message: 'Import session expired.' })
      .eq('id', req.id)
    return NextResponse.json({ error: 'This import session expired. Please start again.' }, { status: 410 })
  }

  // Atomic single-shot gate: only one caller can move pending → processing.
  const { data: transitioned } = await service
    .from('listing_import_requests')
    .update({ status: 'processing' })
    .eq('id', req.id)
    .eq('status', 'pending')
    .select('id')
  if (!transitioned || transitioned.length === 0) {
    return NextResponse.json({ error: 'This import is already being processed.' }, { status: 409 })
  }

  const fail = async (message: string, httpStatus: number) => {
    await service
      .from('listing_import_requests')
      .update({ status: 'failed', error_message: message })
      .eq('id', req.id)
    return NextResponse.json({ error: message }, { status: httpStatus })
  }

  // Verify the claimed storage paths against what's actually in the bucket.
  let personalPaths: string[], buildingPaths: string[]
  try {
    personalPaths = await verifyUploadedPaths(req.id, input.personalPaths, 'personal')
    buildingPaths = await verifyUploadedPaths(req.id, input.buildingPaths, 'building')
  } catch (err) {
    const message = err instanceof UploadError ? err.message : 'Could not verify the uploaded files.'
    return fail(message, 400)
  }

  // Persist the source fields now that they're validated.
  const { error: updateErr } = await service
    .from('listing_import_requests')
    .update({
      personal_source_url: input.personalSourceUrl ?? null,
      personal_pasted_text: input.personalPastedText ?? null,
      building_source_url: input.buildingSourceUrl ?? null,
      building_pasted_text: input.buildingPastedText ?? null,
      building_name: input.buildingName ?? null,
      floor_plan_name: input.floorPlanName ?? null,
      consent_confirmed: input.consentConfirmed,
      building_enrichment_consent: input.buildingEnrichmentConsent,
      personal_image_paths: personalPaths,
      building_image_paths: buildingPaths,
    })
    .eq('id', req.id)
  if (updateErr) {
    console.error('[listing-imports] persist inputs failed', updateErr)
    return fail('Could not save the import. Please try again.', 500)
  }

  // Fresh signed READ urls for the AI call (private bucket).
  const signed = await signImportUrls([...personalPaths, ...buildingPaths])
  const missingSigned = [...personalPaths, ...buildingPaths].filter(p => !signed[p])
  if (missingSigned.length > 0) {
    console.error('[listing-imports] signing failed for', missingSigned)
    return fail('Could not read the uploaded files. Please try again.', 500)
  }

  console.info('[listing-imports] AI extraction started', { requestId: req.id })
  const aiInput: ListingImportInput = {
    email: input.email,
    personalSourceUrl: input.personalSourceUrl,
    personalPastedText: input.personalPastedText,
    personalImageUrls: personalPaths.map(p => signed[p]),
    buildingSourceUrl: input.buildingSourceUrl,
    buildingPastedText: input.buildingPastedText,
    buildingImageUrls: buildingPaths.map(p => signed[p]),
    buildingName: input.buildingName,
    floorPlanName: input.floorPlanName,
  }

  const extraction = await extractListingDraft(aiInput)
  if (!extraction.ok) {
    return fail(extraction.error, 502)
  }
  console.info('[listing-imports] AI extraction completed', {
    requestId: req.id,
    confidence: extraction.draft.confidence.overall,
    conflicts: extraction.draft.conflictsBetweenSources.length,
  })

  // Hold for admin review. No claim token + no user email yet — those happen
  // only after an admin approves.
  const { error: finalizeErr } = await service
    .from('listing_import_requests')
    .update({ status: 'awaiting_admin_review', extracted_data: extraction.draft })
    .eq('id', req.id)
  if (finalizeErr) {
    console.error('[listing-imports] finalize failed', finalizeErr)
    return fail('Could not save the draft. Please try again.', 500)
  }
  console.info('[listing-imports] draft created, awaiting admin review', { requestId: req.id })

  // Notify admins to review (best-effort).
  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    const { subject, html } = importReviewAdminEmail({
      reviewUrl: `${APP_URL}/admin/import-review/${req.id}`,
      submitterEmail: input.email,
      listingTitle: extraction.draft.title,
    })
    await sendEmail({ to: adminEmails, subject, html })
    console.info('[listing-imports] admin review email sent', { requestId: req.id, recipients: adminEmails.length })
  } else {
    console.error('[listing-imports] no admin recipients — review email not sent', { requestId: req.id })
  }

  return NextResponse.json({ ok: true })
}
