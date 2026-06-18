/**
 * Live-vs-seed supply count, so you know when there's enough real supply to
 * tear the seeds down.
 *   node --env-file=.env.local scripts/seedStats.mjs   (npm run seed:stats)
 */
import { serviceClient, assertSchemaReady } from './_seedShared.mjs'

async function countWhere(db, build) {
  const { count, error } = await build(
    db.from('listings').select('id', { count: 'exact', head: true }),
  )
  if (error) throw error
  return count ?? 0
}

async function main() {
  const db = serviceClient()
  await assertSchemaReady(db)

  const userActive = await countWhere(db, q => q.eq('source', 'user').eq('status', 'active'))
  const userAll = await countWhere(db, q => q.eq('source', 'user'))
  const seedActive = await countWhere(db, q => q.eq('source', 'seed').eq('status', 'active'))
  const seedAll = await countWhere(db, q => q.eq('source', 'seed'))
  const partnerActive = await countWhere(db, q => q.eq('source', 'partner').eq('status', 'active'))
  const partnerAll = await countWhere(db, q => q.eq('source', 'partner'))

  console.log('\n── Wroomly listing supply ──')
  console.log(`  Real user listings   : ${userActive} active  (${userAll} total)`)
  console.log(`  Partner listings     : ${partnerActive} active  (${partnerAll} total)`)
  console.log(`  Seed listings        : ${seedActive} active  (${seedAll} total)`)
  const total = userActive + seedActive
  const pct = total ? Math.round((userActive / total) * 100) : 0
  console.log(`  Real share of active : ${pct}%`)
  if (seedActive > 0 && userActive >= seedActive) {
    console.log('\n  ✓ Real supply now meets or exceeds seed supply — consider running seed:teardown.')
  }
  console.log('')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
