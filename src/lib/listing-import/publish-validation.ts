import type { ExtractedListingDraft } from '@/types/listing-import'

export interface PublishContext {
  ownerUserId: string | null
  userConfirmedAccuracy: boolean
  /** Whether the building/floor-plan enrichment source was used at all. */
  enrichmentUsed: boolean
  /** User's confirmation that enriched details apply to their unit. */
  userConfirmedEnrichment: boolean
  /** Count of photos the user has confirmed for the public listing. */
  confirmedPhotoCount: number
  /** Listing intentionally has no end date. */
  openEnded?: boolean
}

export interface PublishCheck {
  ok: boolean
  /** Human-readable, ordered list of what's blocking publish. */
  missing: string[]
}

/**
 * Pure publish gate. Returns the ordered list of everything still blocking
 * publication. The caller (publish route) re-runs this server-side; the UI
 * shows `missing` as prompts. Never trust the client's own check alone.
 */
export function validatePublishRequirements(
  draft: ExtractedListingDraft,
  ctx: PublishContext,
): PublishCheck {
  const missing: string[] = []

  if (!ctx.ownerUserId) missing.push('You must be signed in and own this listing.')

  if (!draft.title || draft.title.trim().length === 0) missing.push('A title')
  if (!draft.description || draft.description.trim().length === 0)
    missing.push('A description')

  if (!(typeof draft.rentMonthly === 'number' && draft.rentMonthly > 0))
    missing.push('Monthly rent')

  if (!draft.availableFrom) missing.push('An availability start date')
  if (!ctx.openEnded && !draft.availableTo)
    missing.push('An availability end date (or mark it open-ended)')

  if (!draft.listingType) missing.push('A listing type (room, studio, etc.)')

  if (!draft.address || draft.address.trim().length === 0)
    missing.push('Street address — required for the map to work')

  if (ctx.confirmedPhotoCount < 1) missing.push('At least one photo')

  if (!ctx.userConfirmedAccuracy)
    missing.push('Confirm you reviewed the listing and it’s accurate')

  if (ctx.enrichmentUsed && !ctx.userConfirmedEnrichment)
    missing.push('Confirm the building/floor-plan details apply to your unit')

  return { ok: missing.length === 0, missing }
}
