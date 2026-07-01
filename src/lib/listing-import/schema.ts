import { z } from 'zod'

// ── Upload limits (shared between client + server validation) ──
export const UPLOAD_LIMITS = {
  maxFiles: 10,
  maxBytesPerFile: 8 * 1024 * 1024, // 8MB (images)
  maxPdfBytesPerFile: 25 * 1024 * 1024, // 25MB (PDFs can be larger)
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const,
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const,
}

/** True when a stored file is a publishable image (not a PDF source doc). */
export function isPublishablePhotoPath(path: string): boolean {
  return !/\.pdf$/i.test(path)
}

export const MAX_PASTED_TEXT = 20_000 // chars — generous, prevents abuse

// ── Import request input (post-parse: the API normalizes FormData to this) ──
// File *contents* are validated separately during multipart parsing; here we
// validate the scalar fields + the cross-field rules.
export const importInputSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address.'),

    personalSourceUrl: z
      .string()
      .trim()
      .url('Enter a valid link.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    personalPastedText: z
      .string()
      .trim()
      .max(MAX_PASTED_TEXT, 'That text is too long.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    // Count of personal images the API parsed from the upload — used for the
    // "text OR images required" rule. The actual files live elsewhere.
    personalImageCount: z.number().int().min(0).default(0),

    buildingSourceUrl: z
      .string()
      .trim()
      .url('Enter a valid building/floor plan link.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    buildingPastedText: z
      .string()
      .trim()
      .max(MAX_PASTED_TEXT, 'That text is too long.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    buildingImageCount: z.number().int().min(0).default(0),
    buildingName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    floorPlanName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal('').transform(() => undefined)),

    consentConfirmed: z.boolean(),
    buildingEnrichmentConsent: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    // Consent is mandatory.
    if (!v.consentConfirmed) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentConfirmed'],
        message: 'Please confirm this is your listing or you have permission.',
      })
    }

    // At least one personal source of truth.
    const hasPersonalText = !!v.personalPastedText && v.personalPastedText.length > 0
    const hasPersonalImages = v.personalImageCount > 0
    if (!hasPersonalText && !hasPersonalImages) {
      ctx.addIssue({
        code: 'custom',
        path: ['personalPastedText'],
        message:
          'Paste your sublet post text or upload at least one screenshot/photo.',
      })
    }

    // If ANY building content was provided, the enrichment consent is required.
    const hasBuildingContent =
      !!v.buildingSourceUrl ||
      !!v.buildingPastedText ||
      v.buildingImageCount > 0 ||
      !!v.buildingName ||
      !!v.floorPlanName
    if (hasBuildingContent && !v.buildingEnrichmentConsent) {
      ctx.addIssue({
        code: 'custom',
        path: ['buildingEnrichmentConsent'],
        message:
          'Please confirm you understand building details are enrichment only.',
      })
    }
  })

export type ImportInput = z.infer<typeof importInputSchema>

// ── Strict AI output schema. Validates the model's JSON before we trust it. ──
const nullableNum = z.number().nullable()
const conf01 = z.number().min(0).max(1)

export const extractedListingDraftSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),

  rentMonthly: z.number().nonnegative().nullable(),
  currency: z.literal('USD').nullable(),
  utilitiesIncluded: z.boolean().nullable(),
  depositAmount: z.number().nonnegative().nullable(),

  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  availabilityNotes: z.string().nullable(),

  listingType: z
    .enum(['ROOM', 'ENTIRE_APARTMENT', 'SHARED_APARTMENT', 'STUDIO', 'OTHER'])
    .nullable(),
  leaseType: z
    .enum(['SUBLET', 'LEASE_TRANSFER', 'FULL_LEASE', 'OTHER'])
    .nullable(),

  address: z.string().nullable(),
  // Not part of the AI's own JSON output (it never emits these) — `.catch(null)`
  // so parsing the model's raw response still succeeds when the keys are
  // absent. Populated later, client-side, when a real address is geocoded.
  lat: z.number().nullable().catch(null),
  lng: z.number().nullable().catch(null),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),

  buildingName: z.string().nullable(),
  floorPlanName: z.string().nullable(),

  campusArea: z
    .enum([
      'CENTRAL_CAMPUS',
      'NORTH_CAMPUS',
      'MEDICAL_CAMPUS',
      'ROSS',
      'LAW_QUAD',
      'OTHER',
      'UNKNOWN',
    ])
    .nullable(),
  campusProximityNotes: z.string().nullable(),

  bedrooms: nullableNum,
  bathrooms: nullableNum,
  furnished: z.boolean().nullable(),

  roommates: nullableNum,
  roommateNotes: z.string().nullable(),

  amenities: z.array(z.string()),
  buildingAmenities: z.array(z.string()),
  unitAmenities: z.array(z.string()),

  petPolicy: z.string().nullable(),
  parking: z.string().nullable(),
  laundry: z.string().nullable(),
  airConditioning: z.boolean().nullable(),

  photos: z.array(
    z.object({
      sourceUrl: z.string(),
      caption: z.string().nullable(),
      isLikelyHousingPhoto: z.boolean(),
      sourceType: z.enum([
        'USER_UPLOADED_PERSONAL',
        'USER_UPLOADED_BUILDING',
        'UNKNOWN',
      ]),
      shouldRequireUserConfirmationBeforePublish: z.boolean(),
    }),
  ),

  sourceAttribution: z.object({
    fieldsFromPersonalSubletSource: z.array(z.string()),
    fieldsFromBuildingSource: z.array(z.string()),
    fieldsGeneratedByAI: z.array(z.string()),
    fieldsNeedingUserConfirmation: z.array(z.string()),
  }),

  conflictsBetweenSources: z.array(
    z.object({
      field: z.string(),
      personalSourceValue: z.string().nullable(),
      buildingSourceValue: z.string().nullable(),
      resolution: z.enum([
        'USED_PERSONAL_SOURCE',
        'USED_BUILDING_SOURCE',
        'LEFT_NULL',
        'NEEDS_USER_CONFIRMATION',
      ]),
      note: z.string(),
    }),
  ),

  contactInfoFoundInOriginalPost: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    socialHandle: z.string().nullable(),
  }),

  generatedMarketingCopy: z.object({
    shortTitle: z.string().nullable(),
    polishedDescription: z.string().nullable(),
    highlights: z.array(z.string()),
  }),

  missingFields: z.array(z.string()),
  uncertaintyNotes: z.array(z.string()),

  confidence: z.object({
    overall: conf01,
    rent: conf01.nullable(),
    dates: conf01.nullable(),
    location: conf01.nullable(),
    photos: conf01.nullable(),
    buildingEnrichment: conf01.nullable(),
  }),

  safetyFlags: z.object({
    mayContainPersonalInfo: z.boolean(),
    suspiciousOrScamLike: z.boolean(),
    duplicateOrRepostRisk: z.boolean(),
    unclearOwnership: z.boolean(),
    copyrightedBuildingMarketingContentRisk: z.boolean(),
    buildingPhotosPermissionUnclear: z.boolean(),
  }),
})

export type ExtractedListingDraftParsed = z.infer<typeof extractedListingDraftSchema>
