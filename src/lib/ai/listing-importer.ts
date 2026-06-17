import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { ListingImportInput, ExtractedListingDraft } from '@/types/listing-import'
import { extractedListingDraftSchema } from '@/lib/listing-import/schema'
import { normalizeExtractedListing } from '@/lib/listing-import/normalize'

// Sonnet — extraction quality from photos + screenshots matters far more
// than the per-import cost (one call per listing, low volume). Sonnet reads
// messy screenshots and writes far better listing copy than Haiku.
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 3500

let _client: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — listing import unavailable')
  }
  _client = new Anthropic({ apiKey })
  return _client
}

const SYSTEM_PROMPT = `You are an expert housing-listing extraction assistant for Wroomly, a University of Michigan student subletting marketplace in Ann Arbor, Michigan.

You receive two kinds of source material:

1. PERSONAL SUBLET SOURCE — the user's own post text, screenshots, and photos. This is the SOURCE OF TRUTH for: rent, availability dates, the exact room/unit being sublet, roommate situation, utilities included, deposit, lease/sublet terms, personal conditions, and contact info.

2. BUILDING / FLOOR-PLAN ENRICHMENT SOURCE — an optional official apartment/residence/floor-plan page (e.g. Verve, Hub, Six11, Landmark, Foundry, Vic Village, Zaragon). Use ONLY to enrich FACTUAL building details: building name, floor-plan name, building amenities, unit amenities clearly tied to the floor plan, neighborhood, campus proximity, furnished status if stated, parking, laundry, pet policy, and bedroom/bathroom counts clearly tied to the relevant floor plan.

RULES:
- Extract only facts explicitly present. NEVER invent rent, dates, location, amenities, or policies. Use null when unknown.
- Put ambiguous details in uncertaintyNotes; put missing important details in missingFields.
- The personal source ALWAYS wins over the building source on conflict. Record every conflict in conflictsBetweenSources with resolution USED_PERSONAL_SOURCE (or NEEDS_USER_CONFIRMATION if you truly can't tell).
- Example: building page says "2 bed / 2 bath" but the user says "one room in a 2 bed / 2 bath" → listingType is ROOM, not ENTIRE_APARTMENT.
- Example: building lists units "from $1,800" but the user is subletting for $1,200 → use 1200 and note the discrepancy.
- If the building source lists amenities the user didn't mention, put them in buildingAmenities and add them to fieldsFromBuildingSource. If unsure an amenity applies to this exact unit, add it to fieldsNeedingUserConfirmation.
- NEVER copy building/realty marketing text verbatim. Rewrite descriptions in neutral, concise, student-friendly language using only factual details.
- Do NOT treat official building/floor-plan images as listing photos. For any building-sourced photo set shouldRequireUserConfirmationBeforePublish=true and sourceType=USER_UPLOADED_BUILDING.
- Convert rent to a monthly whole-USD number when clear ($950/mo → 950; "$1,200 including utilities" → 1200 + utilitiesIncluded=true). rentMonthly and depositAmount are in WHOLE DOLLARS, not cents.
- Parse date phrasings: "May-August", "5/1 to 8/15", "summer sublet" → availableFrom/availableTo as ISO YYYY-MM-DD when a year is inferable; otherwise leave the dates null and explain in availabilityNotes. Today's date is provided below for inference.
- Classify campusArea from text when possible, else UNKNOWN. If no exact address, use neighborhood/campus area — never fabricate an address.
- Flag safety concerns: suspicious payment asks / scam signals (suspiciousOrScamLike), private/sensitive info visible in screenshots (mayContainPersonalInfo), unclear ownership (unclearOwnership), repost risk (duplicateOrRepostRisk), copyrighted building marketing (copyrightedBuildingMarketingContentRisk), unclear building-photo permission (buildingPhotosPermissionUnclear).
- Never include discriminatory or illegal housing language.
- generatedMarketingCopy.polishedDescription / shortTitle: your own clean rewrite from known facts only. Mark these field names in fieldsGeneratedByAI.
- PDFs: some sources are PDF documents (lease/sublease agreements, building flyers, floor-plan sheets). Read the full document — extract rent, dates, address, unit details, amenities, and policies from the text and any embedded floor plans or photos. A PDF lease often contains the most reliable rent/date/address facts; treat a personal-source PDF as authoritative the same as the user's own post.
- PHOTO-FIRST: many submissions are photos of the room/apartment with little or no text. Read the images carefully and extract everything visible — room type, furnishings (furnished vs empty), apparent bedroom/bathroom layout, in-unit laundry, view, kitchen, condition — and any rent/dates/address visible in a screenshot. Always write an appealing, accurate title + description from what the photos actually show. Do NOT invent rent, exact dates, address, or policies that aren't visible; leave those null and list them in missingFields so the user fills them in. A photo-only listing should still come out clean and compelling.
- Always produce a non-null title and description, even from photos alone (describe the space honestly). Only leave them null if there is genuinely nothing to describe.
- All confidence values are between 0 and 1.

Return ONLY a single valid JSON object matching the schema the user message specifies. No prose, no code fences.`

type MediaBlock = Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam

/**
 * Build vision/document blocks from uploaded source files. Images become
 * `image` blocks; PDFs become `document` blocks (Sonnet reads PDF pages
 * natively — text + layout + embedded images).
 */
function buildMediaBlocks(
  urls: string[] | undefined,
  base64: ListingImportInput['personalImageBase64Payloads'],
): MediaBlock[] {
  const blocks: MediaBlock[] = []
  for (const url of urls ?? []) {
    if (/\.pdf$/i.test(url)) {
      blocks.push({ type: 'document', source: { type: 'url', url } })
    } else {
      blocks.push({ type: 'image', source: { type: 'url', url } })
    }
  }
  for (const p of base64 ?? []) {
    if (p.mimeType === 'application/pdf') {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: p.data },
      })
    } else {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          // SDK expects a specific media-type union; cast the validated value.
          media_type: p.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: p.data,
        },
      })
    }
  }
  return blocks
}

const SCHEMA_HINT = `Required JSON shape (use null for unknowns, [] for empty arrays):
{
  "title": string|null, "description": string|null,
  "rentMonthly": number|null, "currency": "USD"|null, "utilitiesIncluded": boolean|null, "depositAmount": number|null,
  "availableFrom": string|null, "availableTo": string|null, "availabilityNotes": string|null,
  "listingType": "ROOM"|"ENTIRE_APARTMENT"|"SHARED_APARTMENT"|"STUDIO"|"OTHER"|null,
  "leaseType": "SUBLET"|"LEASE_TRANSFER"|"FULL_LEASE"|"OTHER"|null,
  "address": string|null, "neighborhood": string|null, "city": string|null, "state": string|null, "zipCode": string|null,
  "buildingName": string|null, "floorPlanName": string|null,
  "campusArea": "CENTRAL_CAMPUS"|"NORTH_CAMPUS"|"MEDICAL_CAMPUS"|"ROSS"|"LAW_QUAD"|"OTHER"|"UNKNOWN"|null, "campusProximityNotes": string|null,
  "bedrooms": number|null, "bathrooms": number|null, "furnished": boolean|null,
  "roommates": number|null, "roommateNotes": string|null,
  "amenities": string[], "buildingAmenities": string[], "unitAmenities": string[],
  "petPolicy": string|null, "parking": string|null, "laundry": string|null, "airConditioning": boolean|null,
  "photos": [{ "sourceUrl": string, "caption": string|null, "isLikelyHousingPhoto": boolean, "sourceType": "USER_UPLOADED_PERSONAL"|"USER_UPLOADED_BUILDING"|"UNKNOWN", "shouldRequireUserConfirmationBeforePublish": boolean }],
  "sourceAttribution": { "fieldsFromPersonalSubletSource": string[], "fieldsFromBuildingSource": string[], "fieldsGeneratedByAI": string[], "fieldsNeedingUserConfirmation": string[] },
  "conflictsBetweenSources": [{ "field": string, "personalSourceValue": string|null, "buildingSourceValue": string|null, "resolution": "USED_PERSONAL_SOURCE"|"USED_BUILDING_SOURCE"|"LEFT_NULL"|"NEEDS_USER_CONFIRMATION", "note": string }],
  "contactInfoFoundInOriginalPost": { "name": string|null, "phone": string|null, "email": string|null, "socialHandle": string|null },
  "generatedMarketingCopy": { "shortTitle": string|null, "polishedDescription": string|null, "highlights": string[] },
  "missingFields": string[], "uncertaintyNotes": string[],
  "confidence": { "overall": number, "rent": number|null, "dates": number|null, "location": number|null, "photos": number|null, "buildingEnrichment": number|null },
  "safetyFlags": { "mayContainPersonalInfo": boolean, "suspiciousOrScamLike": boolean, "duplicateOrRepostRisk": boolean, "unclearOwnership": boolean, "copyrightedBuildingMarketingContentRisk": boolean, "buildingPhotosPermissionUnclear": boolean }
}`

export type ExtractionResult =
  | { ok: true; draft: ExtractedListingDraft }
  | { ok: false; error: string }

/**
 * Run the AI extraction. Returns a normalized, schema-validated draft, or a
 * clean error result (never throws for model/parse failures — the caller
 * marks the import request FAILED and does not create a broken listing).
 */
export async function extractListingDraft(
  input: ListingImportInput,
): Promise<ExtractionResult> {
  const today = new Date().toISOString().slice(0, 10)

  const userBlocks: Anthropic.ContentBlockParam[] = []

  userBlocks.push({
    type: 'text',
    text: `Today's date: ${today}. Context: University of Michigan / Ann Arbor sublets.

=== PERSONAL SUBLET SOURCE (source of truth) ===
${input.personalSourceUrl ? `Source link (for reference only, not scraped): ${input.personalSourceUrl}\n` : ''}${input.personalPastedText ? `Pasted post:\n${input.personalPastedText}` : '(no pasted text — see images below)'}`,
  })

  const personalImgs = buildMediaBlocks(
    input.personalImageUrls,
    input.personalImageBase64Payloads,
  )
  if (personalImgs.length) {
    userBlocks.push({ type: 'text', text: 'Personal sublet screenshots, photos, and PDFs:' })
    userBlocks.push(...personalImgs)
  }

  const hasBuilding =
    input.buildingSourceUrl ||
    input.buildingPastedText ||
    input.buildingName ||
    input.floorPlanName ||
    (input.buildingImageUrls?.length ?? 0) > 0 ||
    (input.buildingImageBase64Payloads?.length ?? 0) > 0

  if (hasBuilding) {
    userBlocks.push({
      type: 'text',
      text: `=== BUILDING / FLOOR-PLAN ENRICHMENT SOURCE (factual enrichment only) ===
${input.buildingName ? `Building name: ${input.buildingName}\n` : ''}${input.floorPlanName ? `Floor plan: ${input.floorPlanName}\n` : ''}${input.buildingSourceUrl ? `Building link (reference only): ${input.buildingSourceUrl}\n` : ''}${input.buildingPastedText ? `Pasted building/floor-plan details:\n${input.buildingPastedText}` : ''}`,
    })
    const buildingImgs = buildMediaBlocks(
      input.buildingImageUrls,
      input.buildingImageBase64Payloads,
    )
    if (buildingImgs.length) {
      userBlocks.push({ type: 'text', text: 'Building/floor-plan screenshots and PDFs:' })
      userBlocks.push(...buildingImgs)
    }
  }

  userBlocks.push({ type: 'text', text: SCHEMA_HINT })

  let rawText: string
  try {
    const resp = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userBlocks }],
    })
    rawText = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[listing-importer] AI call failed:', msg)
    if (msg.includes('credit balance')) {
      return { ok: false, error: 'AI is temporarily unavailable. Please try again later.' }
    }
    return { ok: false, error: 'Could not analyze your listing. Please try again.' }
  }

  // Strip accidental code fences.
  const jsonStr = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[listing-importer] AI returned non-JSON output')
    return { ok: false, error: 'Could not read the listing details. Please try again.' }
  }

  const result = extractedListingDraftSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[listing-importer] AI output failed schema validation', result.error.issues.slice(0, 5))
    return { ok: false, error: 'The extracted listing was incomplete. Please try again.' }
  }

  return { ok: true, draft: normalizeExtractedListing(result.data as ExtractedListingDraft) }
}
