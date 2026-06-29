import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'
import { extractedListingDraftSchema, isPublishablePhotoPath } from '@/lib/listing-import/schema'
import { copyImportFileToPublic } from '@/lib/listing-import/uploads'
import { normalizeExtractedListing } from '@/lib/listing-import/normalize'
import { validatePublishRequirements } from '@/lib/listing-import/publish-validation'
import { dispatchInstantForListing } from '@/lib/match/dispatch'
import { z } from 'zod'

export const runtime = 'nodejs'

const bodySchema = z.object({
  token: z.string().min(1),
  draft: extractedListingDraftSchema, // the user-edited draft
  confirmedPhotoPaths: z.array(z.string()).default([]),
  userConfirmedAccuracy: z.boolean(),
  userConfirmedEnrichment: z.boolean().default(false),
})

function derivePetsAllowed(petPolicy: string | null): boolean {
  if (!petPolicy) return false
  const p = petPolicy.toLowerCase()
  if (/no pet|not allowed|no dogs|no cats/.test(p)) return false
  return /allow|welcome|friendly|yes|ok|permitted/.test(p)
}

/**
 * POST /api/listing-imports/publish
 * Materializes a real `listings` row from a claimed, edited draft. This is
 * the ONLY path that makes an AI draft public — gated on auth, ownership,
 * confirmations, and the full publish-requirements check (re-run server-side).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: req } = await service
    .from('listing_import_requests')
    .select(
      'id, status, claim_token_expires_at, claimed_by_user_id, listing_id, building_source_url, building_pasted_text, building_name, floor_plan_name, building_image_paths',
    )
    .eq('claim_token_hash', hashClaimToken(body.token))
    .maybeSingle()

  if (!req || req.status !== 'completed')
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  if (isClaimTokenExpired(req.claim_token_expires_at))
    return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
  if (req.listing_id)
    return NextResponse.json(
      { error: 'This listing was already published.', listingId: req.listing_id },
      { status: 409 },
    )
  if (req.claimed_by_user_id !== user.id)
    return NextResponse.json({ error: 'You don’t have access to this draft.' }, { status: 403 })

  // PDFs are AI source material, never listing photos — drop any that slip in.
  const confirmedPhotoPaths = body.confirmedPhotoPaths.filter(isPublishablePhotoPath)

  const draft = normalizeExtractedListing(body.draft)
  const enrichmentUsed =
    !!req.building_source_url ||
    !!req.building_pasted_text ||
    !!req.building_name ||
    !!req.floor_plan_name ||
    (req.building_image_paths?.length ?? 0) > 0

  // Re-run the publish gate server-side — never trust the client's check.
  const check = validatePublishRequirements(draft, {
    ownerUserId: user.id,
    userConfirmedAccuracy: body.userConfirmedAccuracy,
    enrichmentUsed,
    userConfirmedEnrichment: body.userConfirmedEnrichment,
    confirmedPhotoCount: confirmedPhotoPaths.length,
  })
  if (!check.ok) {
    return NextResponse.json(
      { error: 'A few things are needed before publishing.', missing: check.missing },
      { status: 422 },
    )
  }

  // Map draft (whole USD) → listings row (cents). Importer is sublets.
  const { data: listing, error: insertErr } = await service
    .from('listings')
    .insert({
      supplier_id: user.id,
      type: 'sublet',
      title: draft.title,
      description: draft.description,
      neighborhood: draft.neighborhood,
      address: draft.address,
      city: draft.city ?? 'Ann Arbor',
      state: draft.state ?? 'MI',
      price_per_month: draft.rentMonthly != null ? Math.round(draft.rentMonthly * 100) : null,
      deposit_amount: draft.depositAmount != null ? Math.round(draft.depositAmount * 100) : null,
      available_from: draft.availableFrom,
      available_to: draft.availableTo,
      bedrooms: draft.bedrooms != null ? Math.round(draft.bedrooms) : null,
      bathrooms: draft.bathrooms,
      furnished: draft.furnished ?? false,
      pets_allowed: derivePetsAllowed(draft.petPolicy),
      utilities_included: draft.utilitiesIncluded ?? false,
      residence_name: draft.buildingName,
      status: 'active',
    })
    .select('id')
    .single()

  if (insertErr || !listing) {
    console.error('[listing-imports/publish] insert failed', insertErr)
    return NextResponse.json({ error: 'Could not publish the listing.' }, { status: 500 })
  }
  const listingId = listing.id as string

  // Confirmed photos live in the PRIVATE imports bucket. Copy each chosen
  // photo into the PUBLIC listing-images bucket (same path) so the live
  // listing can display it, then record only the ones that copied.
  if (confirmedPhotoPaths.length > 0) {
    const copied: string[] = []
    for (const path of confirmedPhotoPaths) {
      if (await copyImportFileToPublic(path)) copied.push(path)
    }
    if (copied.length > 0) {
      await service.from('listing_images').insert(
        copied.map((path, i) => ({
          listing_id: listingId,
          storage_path: path,
          display_order: i,
        })),
      )
    } else {
      console.error('[listing-imports/publish] no photos copied to public', { requestId: req.id, listingId })
    }
  }

  // Amenities (unioned set from the draft).
  if (draft.amenities.length > 0) {
    await service.from('listing_amenities').insert(
      draft.amenities.map(amenity => ({ listing_id: listingId, amenity })),
    )
  }

  // Link the request to the published listing (prevents re-publish).
  await service
    .from('listing_import_requests')
    .update({ listing_id: listingId })
    .eq('id', req.id)

  // Published an imported listing → fire Wroomly Match alerts now that its
  // photos + amenities are in place (fire-and-forget; guards source='user').
  void dispatchInstantForListing(listingId)

  console.info('[listing-imports/publish] published', { requestId: req.id, listingId, userId: user.id })
  return NextResponse.json({ ok: true, listingId })
}
