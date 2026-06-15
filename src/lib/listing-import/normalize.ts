import type {
  ExtractedListingDraft,
  SourceConflict,
} from '@/types/listing-import'

// MONEY CONVENTION: ExtractedListingDraft holds rent/deposit in whole USD
// dollars (human-facing). The listings table stores cents — convert (×100)
// only when materializing a real listing at publish time.

const trimOrNull = (v: string | null | undefined): string | null => {
  if (v == null) return null
  const t = v.trim()
  return t.length === 0 ? null : t
}

const dedupeTrim = (arr: string[] | null | undefined): string[] => {
  if (!Array.isArray(arr)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of arr) {
    const t = (raw ?? '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

const clamp01 = (n: number | null | undefined): number => {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
const clamp01Nullable = (n: number | null | undefined): number | null =>
  n == null ? null : clamp01(n)

const MAX_DESCRIPTION = 4000

/**
 * Normalize raw AI output into a clean draft:
 * - trim all text, empty strings → null
 * - dedupe + trim amenity arrays; ensure `amenities` is the union of
 *   unit + building + any loose amenities (so the UI has one full list)
 * - clamp all confidence values to 0..1
 * - cap description length
 * - default city/state to Ann Arbor / MI ONLY when a UMich/Ann Arbor signal
 *   is present, else leave null (never invent a location)
 */
export function normalizeExtractedListing(
  raw: ExtractedListingDraft,
): ExtractedListingDraft {
  const unitAmenities = dedupeTrim(raw.unitAmenities)
  const buildingAmenities = dedupeTrim(raw.buildingAmenities)
  const looseAmenities = dedupeTrim(raw.amenities)
  const amenities = dedupeTrim([
    ...looseAmenities,
    ...unitAmenities,
    ...buildingAmenities,
  ])

  const neighborhood = trimOrNull(raw.neighborhood)
  const address = trimOrNull(raw.address)
  const campusArea = raw.campusArea
  // Ann Arbor / UMich signal: any campus area set (non-UNKNOWN), a
  // neighborhood, an address, or a building name implies the local context.
  const hasLocalSignal =
    (campusArea != null && campusArea !== 'UNKNOWN') ||
    !!neighborhood ||
    !!address ||
    !!trimOrNull(raw.buildingName)

  const description = (() => {
    const d = trimOrNull(raw.description)
    if (!d) return null
    return d.length > MAX_DESCRIPTION ? d.slice(0, MAX_DESCRIPTION).trimEnd() : d
  })()

  return {
    ...raw,
    title: trimOrNull(raw.title),
    description,

    rentMonthly:
      typeof raw.rentMonthly === 'number' && raw.rentMonthly >= 0
        ? raw.rentMonthly
        : null,
    currency: raw.rentMonthly != null ? (raw.currency ?? 'USD') : raw.currency,
    depositAmount:
      typeof raw.depositAmount === 'number' && raw.depositAmount >= 0
        ? raw.depositAmount
        : null,

    availableFrom: trimOrNull(raw.availableFrom),
    availableTo: trimOrNull(raw.availableTo),
    availabilityNotes: trimOrNull(raw.availabilityNotes),

    address,
    neighborhood,
    city: trimOrNull(raw.city) ?? (hasLocalSignal ? 'Ann Arbor' : null),
    state: trimOrNull(raw.state) ?? (hasLocalSignal ? 'MI' : null),
    zipCode: trimOrNull(raw.zipCode),

    buildingName: trimOrNull(raw.buildingName),
    floorPlanName: trimOrNull(raw.floorPlanName),
    campusProximityNotes: trimOrNull(raw.campusProximityNotes),

    roommateNotes: trimOrNull(raw.roommateNotes),
    petPolicy: trimOrNull(raw.petPolicy),
    parking: trimOrNull(raw.parking),
    laundry: trimOrNull(raw.laundry),

    amenities,
    buildingAmenities,
    unitAmenities,

    missingFields: dedupeTrim(raw.missingFields),
    uncertaintyNotes: (raw.uncertaintyNotes ?? []).map(s => s.trim()).filter(Boolean),

    confidence: {
      overall: clamp01(raw.confidence?.overall),
      rent: clamp01Nullable(raw.confidence?.rent),
      dates: clamp01Nullable(raw.confidence?.dates),
      location: clamp01Nullable(raw.confidence?.location),
      photos: clamp01Nullable(raw.confidence?.photos),
      buildingEnrichment: clamp01Nullable(raw.confidence?.buildingEnrichment),
    },
  }
}

/**
 * Deterministic backstop conflict detection — independent of the AI's own
 * conflictsBetweenSources. Compares the same field extracted from each
 * source and flags mismatches, always resolving in favor of the personal
 * source (the source of truth). Used to double-check the AI didn't miss a
 * conflict on the high-stakes fields.
 */
export function detectSourceConflicts(
  personal: Partial<Record<string, string | number | null>>,
  building: Partial<Record<string, string | number | null>>,
  fields: string[] = ['rentMonthly', 'bedrooms', 'bathrooms', 'furnished'],
): SourceConflict[] {
  const conflicts: SourceConflict[] = []
  for (const field of fields) {
    const p = personal[field]
    const b = building[field]
    if (p == null || b == null) continue
    if (String(p).trim().toLowerCase() === String(b).trim().toLowerCase()) continue
    conflicts.push({
      field,
      personalSourceValue: String(p),
      buildingSourceValue: String(b),
      resolution: 'USED_PERSONAL_SOURCE',
      note: `Your post says ${p}; the building/floor-plan source says ${b}. Using your post.`,
    })
  }
  return conflicts
}

export type SourceLabel =
  | 'PERSONAL'
  | 'BUILDING'
  | 'AI'
  | 'NEEDS_CONFIRMATION'
  | 'UNKNOWN'

/**
 * Flatten the draft's sourceAttribution into a field → label map the review
 * UI uses to badge each field. "Needs confirmation" wins over the others so
 * uncertain fields are always surfaced.
 */
export function mapSourceAttribution(
  attribution: ExtractedListingDraft['sourceAttribution'],
): Record<string, SourceLabel> {
  const map: Record<string, SourceLabel> = {}
  for (const f of attribution.fieldsFromPersonalSubletSource ?? []) map[f] = 'PERSONAL'
  for (const f of attribution.fieldsFromBuildingSource ?? []) map[f] = 'BUILDING'
  for (const f of attribution.fieldsGeneratedByAI ?? []) map[f] = 'AI'
  // Highest priority — overrides whatever was set above.
  for (const f of attribution.fieldsNeedingUserConfirmation ?? [])
    map[f] = 'NEEDS_CONFIRMATION'
  return map
}
