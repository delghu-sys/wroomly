/**
 * The `listings` columns that anon + authenticated roles are allowed to read
 * (migration 035 column-locks the rest). Use this instead of `*` in any
 * listings SELECT that runs under the session/anon client — a bare `select('*')`
 * under those roles now fails with "permission denied" because it references
 * the revoked columns (inquiry_email + the auto_review_* moderation fields).
 *
 * Keep in sync with migration 035's grant list. If you add a listings column
 * that should be publicly readable, add it here AND to 035's grant.
 *
 * Server code that legitimately needs the locked columns (the partner-inquiry
 * route, the admin review queue, the auto-reviewer) uses the service-role
 * client, which bypasses column grants and does not use this constant.
 */
export const PUBLIC_LISTING_COLUMNS = [
  'id',
  'supplier_id',
  'type',
  'title',
  'description',
  'address',
  'neighborhood',
  'lat',
  'lng',
  'city',
  'state',
  'price_per_month',
  'deposit_amount',
  'available_from',
  'available_to',
  'bedrooms',
  'bathrooms',
  'sq_ft',
  'furnished',
  'pets_allowed',
  'utilities_included',
  'status',
  'created_at',
  'updated_at',
  'property_type',
  'residence_name',
  'auto_reviewed_at',
  'source',
  'source_name',
  'source_url',
  'closed_with',
  'closed_at',
  'video_path',
].join(', ')
