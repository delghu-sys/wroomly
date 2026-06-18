/**
 * Shared helpers for the seed-listing scripts (import / teardown / stats).
 * All of these run server-side with the SERVICE-ROLE key, which bypasses RLS.
 * Run via `node --env-file=.env.local scripts/<name>.mjs`.
 */
import { createClient } from '@supabase/supabase-js'

export const SEED_SOURCE = 'seed'
export const PARTNER_SOURCE = 'partner'
// Dedicated system account that owns every seed listing (listings.supplier_id
// is NOT NULL). Created on demand by the importer via the auth admin API.
export const SEED_USER_EMAIL = 'listings@wroomly.app'
export const SEED_USER_NAME = 'Wroomly Listings'
export const PUBLIC_BUCKET = 'listing-images'

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing env. Run with:  node --env-file=.env.local scripts/<name>.mjs\n' +
        '(needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
    )
    process.exit(1)
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Fail loudly if migration 018 hasn't been applied yet. */
export async function assertSchemaReady(db) {
  const { error } = await db.from('listings').select('source').limit(1)
  if (error && /column .*source.* does not exist/i.test(error.message)) {
    console.error(
      '\n✗ The `listings.source` column is missing. Apply migration 018 in the\n' +
        '  Supabase SQL Editor first (supabase/migrations/018_seed_listings.sql).\n',
    )
    process.exit(1)
  }
  if (error) {
    console.error('Unexpected error checking schema:', error.message)
    process.exit(1)
  }
}
