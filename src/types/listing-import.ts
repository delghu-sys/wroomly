// Types for the AI Listing Importer. The ExtractedListingDraft shape is the
// strict contract the AI module returns and the claim/review UI consumes.

export interface ListingImportInput {
  email: string

  personalSourceUrl?: string
  personalPastedText?: string
  personalImageUrls?: string[]
  personalImageBase64Payloads?: Array<{ mimeType: string; data: string }>

  buildingSourceUrl?: string
  buildingPastedText?: string
  buildingImageUrls?: string[]
  buildingImageBase64Payloads?: Array<{ mimeType: string; data: string }>

  buildingName?: string
  floorPlanName?: string
}

export type ListingTypeExtracted =
  | 'ROOM'
  | 'ENTIRE_APARTMENT'
  | 'SHARED_APARTMENT'
  | 'STUDIO'
  | 'OTHER'

export type LeaseTypeExtracted =
  | 'SUBLET'
  | 'LEASE_TRANSFER'
  | 'FULL_LEASE'
  | 'OTHER'

export type CampusAreaExtracted =
  | 'CENTRAL_CAMPUS'
  | 'NORTH_CAMPUS'
  | 'MEDICAL_CAMPUS'
  | 'ROSS'
  | 'LAW_QUAD'
  | 'OTHER'
  | 'UNKNOWN'

export interface ExtractedPhoto {
  sourceUrl: string
  caption: string | null
  isLikelyHousingPhoto: boolean
  sourceType: 'USER_UPLOADED_PERSONAL' | 'USER_UPLOADED_BUILDING' | 'UNKNOWN'
  shouldRequireUserConfirmationBeforePublish: boolean
}

export interface SourceConflict {
  field: string
  personalSourceValue: string | null
  buildingSourceValue: string | null
  resolution:
    | 'USED_PERSONAL_SOURCE'
    | 'USED_BUILDING_SOURCE'
    | 'LEFT_NULL'
    | 'NEEDS_USER_CONFIRMATION'
  note: string
}

export interface ExtractedListingDraft {
  title: string | null
  description: string | null

  rentMonthly: number | null
  currency: 'USD' | null
  utilitiesIncluded: boolean | null
  depositAmount: number | null

  availableFrom: string | null
  availableTo: string | null
  availabilityNotes: string | null

  listingType: ListingTypeExtracted | null
  leaseType: LeaseTypeExtracted | null

  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null

  buildingName: string | null
  floorPlanName: string | null

  campusArea: CampusAreaExtracted | null
  campusProximityNotes: string | null

  bedrooms: number | null
  bathrooms: number | null
  furnished: boolean | null

  roommates: number | null
  roommateNotes: string | null

  amenities: string[]
  buildingAmenities: string[]
  unitAmenities: string[]

  petPolicy: string | null
  parking: string | null
  laundry: string | null
  airConditioning: boolean | null

  photos: ExtractedPhoto[]

  sourceAttribution: {
    fieldsFromPersonalSubletSource: string[]
    fieldsFromBuildingSource: string[]
    fieldsGeneratedByAI: string[]
    fieldsNeedingUserConfirmation: string[]
  }

  conflictsBetweenSources: SourceConflict[]

  contactInfoFoundInOriginalPost: {
    name: string | null
    phone: string | null
    email: string | null
    socialHandle: string | null
  }

  generatedMarketingCopy: {
    shortTitle: string | null
    polishedDescription: string | null
    highlights: string[]
  }

  missingFields: string[]
  uncertaintyNotes: string[]

  // Convention: ALL confidence values are 0..1.
  confidence: {
    overall: number
    rent: number | null
    dates: number | null
    location: number | null
    photos: number | null
    buildingEnrichment: number | null
  }

  safetyFlags: {
    mayContainPersonalInfo: boolean
    suspiciousOrScamLike: boolean
    duplicateOrRepostRisk: boolean
    unclearOwnership: boolean
    copyrightedBuildingMarketingContentRisk: boolean
    buildingPhotosPermissionUnclear: boolean
  }
}
