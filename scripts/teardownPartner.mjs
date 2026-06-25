/**
 * One-command teardown of a SINGLE partner's listings, scoped by source_name so
 * one partner can be removed without touching another (or user/seed listings).
 *
 *   node --env-file=.env.local scripts/teardownPartner.mjs --source-name="MichiganRental" --dry-run
 *   node --env-file=.env.local scripts/teardownPartner.mjs --source-name="MichiganRental"
 *   node --env-file=.env.local scripts/teardownPartner.mjs --file=michiganrental   (reads sourceName from the seed file)
 *
 *   npm run partners:teardown:mr   → MichiganRental (dry-run by default; pass -- --yes to delete)
 *
 * Deletes every listing WHERE source='partner' AND source_name=<name>.
 * listing_images and listing_amenities rows are removed via ON DELETE CASCADE.
 * A2 (or any other partner), user listings, and seed listings are never touched.
 *
 * NOTE: the listings' photo objects in Supabase storage are NOT deleted (they're
 * harmless orphans and cheap); only the DB rows that make the listings appear on
 * the site are removed. Re-import with `npm run partners:import:mr` to restore.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { serviceClient, assertSchemaReady, PARTNER_SOURCE } from './_seedShared.mjs'

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--yes')

async function resolveSourceName() {
  const direct = arg('source-name')
  if (direct) return direct
  const fileArg = arg('file')
  if (fileArg) {
    const base = fileArg.endsWith('.json') ? fileArg : `wroomly_${fileArg}_listings.json`
    const file = fileURLToPath(new URL(`./seed-data/${base}`, import.meta.url))
    const records = JSON.parse(await readFile(file, 'utf8'))
    return records[0]?.sourceName ?? null
  }
  return null
}

async function main() {
  const sourceName = await resolveSourceName()
  if (!sourceName) {
    console.error(
      'Refusing to run without a partner name. Pass --source-name="MichiganRental"\n' +
        '(or --file=michiganrental). This guard prevents wiping ALL partners by accident.',
    )
    process.exit(1)
  }

  const db = serviceClient()
  await assertSchemaReady(db)

  const { count } = await db
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('source', PARTNER_SOURCE)
    .eq('source_name', sourceName)
  const n = count ?? 0

  if (dryRun) {
    console.log(
      `[dry-run] Would delete ${n} '${sourceName}' partner listing(s) ` +
        `(source='${PARTNER_SOURCE}', source_name='${sourceName}'). No changes made.`,
    )
    console.log('Re-run with --yes (and without --dry-run) to actually delete.')
    return
  }

  if (n === 0) {
    console.log(`No '${sourceName}' partner listings to delete.`)
    return
  }

  const { error } = await db
    .from('listings')
    .delete()
    .eq('source', PARTNER_SOURCE)
    .eq('source_name', sourceName)
  if (error) throw error
  console.log(`Deleted ${n} '${sourceName}' partner listing(s). Cascade removed their images + amenities.`)
  console.log('Other partners, user listings, and seed listings were untouched.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
