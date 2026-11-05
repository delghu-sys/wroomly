// Kept in its own dependency-free file so the middleware's list of valid
// building pages (lib/seo/known-pages) can use it without pulling in the rest
// of the constants. Re-exported from constants.ts, so existing imports work.

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
