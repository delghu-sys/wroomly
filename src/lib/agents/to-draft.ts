import type { ExtractedListingDraft } from '@/types/listing-import'
import { normalizeExtractedListing } from '../listing-import/normalize.ts'

/**
 * Turn what a discovery adapter scraped into a real ExtractedListingDraft —
 * the exact type the claim page (`/claim-listing/[token]`) and its editor
 * (`ClaimReview`) already know how to render and let a person correct.
 *
 * This did not exist before: the draft agent was writing the raw scraped
 * key/value bag (`{leaseType, price, dates, ...}`) straight into
 * `extracted_data`. That silently broke the claim page in two ways — `photos`
 * is accessed as an array there (`initial.photos.filter(...)`) and was simply
 * absent, and the field names didn't match what the pre-fill reads
 * (`rentMonthly`, not `price`; `availableFrom`, not `dates`). This mapper is
 * what makes an agent-sourced draft a first-class citizen of the SAME review
 * UI the AI importer's drafts already use, admin and end-user both.
 *
 * Deliberately conservative: dates like "January - May" or "9/1-8/13/27" are
 * NOT guessed into exact ISO dates — ambiguous parsing here would put a wrong
 * date in front of the person claiming their own listing. The raw string goes
 * into `availabilityNotes` instead, and both date fields land in
 * `missingFields` so the review UI visibly asks for them. Same principle for
 * `description` — never fabricated; the person writes their own.
 */

export interface AnyExtracted {
  price?: string
  dates?: string
  // CMB (src/lib/agents/sources/cmb-resident-sublets.ts)
  posterName?: string
  property?: string
  unitType?: string
  notes?: string
  // Off Campus Universe (src/lib/agents/sources/offcampus-universe.ts)
  leaseType?: string
  bedrooms?: string
  bathrooms?: string
  contactName?: string
  posterType?: string
  [key: string]: unknown
}

function parseMoney(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseCount(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function leadToExtractedDraft({
  title,
  sourceLabel,
  contactEmail,
  extracted,
}: {
  title: string | null
  sourceLabel: string
  contactEmail: string
  extracted: AnyExtracted
}): ExtractedListingDraft {
  const rentMonthly = parseMoney(extracted.price)
  const bedrooms = parseCount(extracted.bedrooms)
  const bathrooms = parseCount(extracted.bathrooms)
  const buildingName = extracted.property?.trim() || null
  const contactName = extracted.contactName?.trim() || extracted.posterName?.trim() || null

  // What we're confident enough to fill vs. what genuinely needs a human.
  const filled = ['title']
  if (rentMonthly != null) filled.push('rentMonthly')
  if (extracted.dates) filled.push('availabilityNotes')
  if (buildingName) filled.push('buildingName')
  if (bedrooms != null) filled.push('bedrooms')
  if (bathrooms != null) filled.push('bathrooms')

  const missingFields = [
    'description',
    'address',
    'availableFrom',
    'availableTo',
    ...(bedrooms == null ? ['bedrooms'] : []),
    ...(bathrooms == null ? ['bathrooms'] : []),
  ]

  const uncertaintyNotes = [
    `Auto-discovered from ${sourceLabel}. Nothing here is published — review every field before publishing.`,
  ]
  if (extracted.dates) {
    uncertaintyNotes.push(
      `The original post's dates were "${extracted.dates}" — set the exact move-in/move-out dates below.`,
    )
  }
  if (extracted.unitType) uncertaintyNotes.push(`Original listing said: "${extracted.unitType}".`)
  if (extracted.notes) uncertaintyNotes.push(`Original notes: "${extracted.notes}".`)
  if (extracted.posterType && extracted.posterType !== 'Student') {
    uncertaintyNotes.push(`Posted as: ${extracted.posterType} (not marked Student).`)
  }

  const draft: ExtractedListingDraft = {
    title: title?.trim() || null,
    description: null, // never fabricated — the person writes their own

    rentMonthly,
    currency: rentMonthly != null ? 'USD' : null,
    utilitiesIncluded: null,
    depositAmount: null,

    availableFrom: null,
    availableTo: null,
    availabilityNotes: extracted.dates?.trim() || null,

    listingType: null,
    leaseType: 'SUBLET', // both registered sources are sublet-only pipelines

    address: null,
    lat: null,
    lng: null,
    neighborhood: null,
    city: 'Ann Arbor',
    state: 'MI',
    zipCode: null,

    buildingName,
    floorPlanName: null,

    campusArea: 'UNKNOWN',
    campusProximityNotes: null,

    bedrooms,
    bathrooms,
    furnished: null,

    roommates: null,
    roommateNotes: null,

    amenities: [],
    buildingAmenities: [],
    unitAmenities: [],

    petPolicy: null,
    parking: null,
    laundry: null,
    airConditioning: null,

    // Discovery never copies photos (see the source adapters' headers) — the
    // person adds their own on claim. This MUST be a real array: ClaimReview
    // calls .filter() on it unconditionally.
    photos: [],

    sourceAttribution: {
      fieldsFromPersonalSubletSource: filled,
      fieldsFromBuildingSource: [],
      fieldsGeneratedByAI: [],
      fieldsNeedingUserConfirmation: missingFields,
    },
    conflictsBetweenSources: [],

    contactInfoFoundInOriginalPost: {
      name: contactName,
      phone: null,
      email: contactEmail,
      socialHandle: null,
    },

    generatedMarketingCopy: { shortTitle: null, polishedDescription: null, highlights: [] },

    missingFields,
    uncertaintyNotes,

    // Conservative on purpose: we auto-extracted facts and a lease type, but
    // never exact dates, so this should read as "needs review", not "done".
    confidence: {
      overall: 0.35,
      rent: rentMonthly != null ? 0.6 : null,
      dates: null,
      location: null,
      photos: null,
      buildingEnrichment: null,
    },

    // No signal either way from these sources — false is the honest default,
    // not an overclaim of safety.
    safetyFlags: {
      mayContainPersonalInfo: false,
      suspiciousOrScamLike: false,
      duplicateOrRepostRisk: false,
      unclearOwnership: false,
      copyrightedBuildingMarketingContentRisk: false,
      buildingPhotosPermissionUnclear: false,
    },
  }

  return normalizeExtractedListing(draft)
}
