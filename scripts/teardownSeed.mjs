/**
 * One-command teardown of ALL seed listings.
 *   node --env-file=.env.local scripts/teardownSeed.mjs --dry-run   (count only)
 *   node --env-file=.env.local scripts/teardownSeed.mjs             (delete)
 *
 * Deletes every listing WHERE source='seed'. listing_images, listing_amenities,
 * and seed_inquiry rows are removed automatically via ON DELETE CASCADE.
 * Real user listings (source='user') are never touched.
 */
import { serviceClient, assertSchemaReady, SEED_SOURCE } from './_seedShared.mjs'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const db = serviceClient()
  await assertSchemaReady(db)

  const { count, error: countErr } = await db
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('source', SEED_SOURCE)
  if (countErr) throw countErr

  const n = count ?? 0
  if (dryRun) {
    console.log(`[dry-run] Would delete ${n} seed listing(s) (source='${SEED_SOURCE}'). No changes made.`)
    return
  }

  if (n === 0) {
    console.log('No seed listings to delete.')
    return
  }

  const { error } = await db.from('listings').delete().eq('source', SEED_SOURCE)
  if (error) throw error
  console.log(`Deleted ${n} seed listing(s). Cascade removed their images, amenities, and waitlist rows.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
