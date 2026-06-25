export const LISTING_TYPES = {
  SUBLET: 'sublet',
  SWAP: 'swap',
} as const

export const LISTING_STATUSES = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  ACTIVE: 'active',
  RENTED: 'rented',
  SWAPPED: 'swapped',
  ARCHIVED: 'archived',
} as const

export const USER_TYPES = {
  SUPPLIER: 'supplier',
  CONSUMER: 'consumer',
  ADMIN: 'admin',
} as const

export const INQUIRY_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const

export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  FIRST_MONTH: 'first_month',
  MONTHLY: 'monthly',
  REFUND: 'refund',
} as const

export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const

export const AMENITIES = [
  'WiFi',
  'Parking',
  'Gym',
  'Laundry In-Unit',
  'Laundry In-Building',
  'Dishwasher',
  'Air Conditioning',
  'Heating',
  'Balcony',
  'Rooftop Access',
  'Elevator',
  'Doorman',
  'Storage Unit',
  'Bike Storage',
  'Pool',
] as const

export const ANN_ARBOR_NEIGHBORHOODS = [
  'Central Campus',
  'North Campus',
  'South University',
  'Kerrytown',
  'Old West Side',
  'Burns Park',
  'Water Hill',
  'Eberwhite',
  'Pittsfield',
  'Downtown',
  'Lower Town',
] as const

// Subset considered walking distance to the main classrooms / Diag.
// Used by the "Near campus" quick filter on /listings.
export const NEAR_CAMPUS_NEIGHBORHOODS = [
  'Central Campus',
  'South University',
  'Kerrytown',
  'Downtown',
] as const

export const MAX_LISTING_IMAGES = 10

// Type of property. "residence" = a named student residence / apartment building
// (e.g. The Standard, Verve). Pickers should also fill in `residence_name`.
// "Apartment" covers both standalone apartments and named residence/complex
// buildings — pick one in `residence_name` if applicable.
export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'studio', label: 'Studio' },
  { value: 'other', label: 'Other' },
] as const

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]['value']

// Curated list of named student residences / apartment complexes in Ann Arbor.
// Used both for listing creation (when property_type === 'residence') and as a
// browse filter on /listings.
export const ANN_ARBOR_RESIDENCES = [
  '411 Lofts',
  'Ann Arbor City Apartments',
  'Arbor Blu',
  'Courtyards',
  'Forest Plaza',
  'Foundry Lofts',
  'HERE Ann Arbor',
  'Hub on Campus',
  'Landmark',
  'Lookout',
  'Saga',
  'Six11',
  'Sterling 411 Lofts',
  'The Bell Tower',
  'The Heritage',
  'The Legacy',
  'The Standard',
  'The Varsity',
  'The Yard',
  'Tower Plaza',
  'Verve',
  'Vic Village North',
  'Vic Village South',
  'Z Place',
] as const
