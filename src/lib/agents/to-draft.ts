import type { ExtractedListingDraft } from '@/types/listing-import'
import { normalizeExtractedListing } from '../listing-import/normalize.ts'
import { parseAvailability, parseStreetAddress } from './prefill.ts'

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
 * Still conservative, but no longer to the point of uselessness. It now READS
 * what a post plainly states — "January to August 2026" is a date range, and
 * an Off Campus Universe title like "721 S Forest Ave" is an address — because
 * making someone retype what their own post already said is exactly the
 * retyping the outreach email promises to save them. What it will not do is
 * GUESS: "January to August" with no year stays unparsed, and a title with no
 * house number yields no address (see prefill.ts). The raw text always
 * survives in `availabilityNotes` either way.
 *
 * A prefilled address still cannot publish anything on its own: lat/lng stay
 * null, and publish-validation requires them, so the person must pick their
 * address from the geocoding suggestions. `description` is likewise never
 * fabricated — the person writes their own.
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

  // Read (never invent) the two fields that cost the most to retype.
  const availability = parseAvailability(extracted.dates)
  const street = parseStreetAddress(title)

  // What we're confident enough to fill vs. what genuinely needs a human.
  const filled = ['title']
  if (rentMonthly != null) filled.push('rentMonthly')
  if (extracted.dates) filled.push('availabilityNotes')
  if (buildingName) filled.push('buildingName')
  if (bedrooms != null) filled.push('bedrooms')
  if (bathrooms != null) filled.push('bathrooms')
  if (street) filled.push('address')
  if (availability?.from) filled.push('availableFrom')
  if (availability?.to) filled.push('availableTo')

  const missingFields = [
    'description',
    ...(street ? [] : ['address']),
    ...(availability?.from ? [] : ['availableFrom']),
    ...(availability?.to ? [] : ['availableTo']),
    ...(bedrooms == null ? ['bedrooms'] : []),
    ...(bathrooms == null ? ['bathrooms'] : []),
  ]

  const uncertaintyNotes = [
    `Auto-discovered from ${sourceLabel}. Nothing here is published — review every field before publishing.`,
  ]
  if (extracted.dates) {
    uncertaintyNotes.push(
      availability
        ? `Dates read from the original post's "${extracted.dates}" — check them, especially the exact days.`
        : `The original post's dates were "${extracted.dates}" — set the exact move-in/move-out dates below.`,
    )
  }
  if (availability?.alreadyEnded) {
    uncertaintyNotes.push(
      'Those dates have already passed. Update them to your actual term before publishing.',
    )
  }
  if (street) {
    uncertaintyNotes.push(
      'The address came from the original listing title. Pick it from the suggestions to place it on the map.',
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

    availableFrom: availability?.from ?? null,
    availableTo: availability?.to ?? null,
    // The raw text is kept even when parsed, so the person can always see what
    // their post actually said next to the dates we read out of it.
    availabilityNotes: extracted.dates?.trim() || null,

    listingType: null,
    leaseType: 'SUBLET', // both registered sources are sublet-only pipelines

    address: street?.address ?? null,
    // Never derived. publish-validation requires real coordinates precisely so
    // that a typed or scraped address cannot masquerade as a located one.
    lat: null,
    lng: null,
    neighborhood: null,
    city: 'Ann Arbor',
    state: 'MI',
    zipCode: street?.zipCode ?? null,

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
