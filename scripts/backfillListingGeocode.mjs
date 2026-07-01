/**
 * Backfill lat/lng for listings that have an address but no coordinates.
 *
 *   node --env-file=.env.local scripts/backfillListingGeocode.mjs --dry-run
 *   node --env-file=.env.local scripts/backfillListingGeocode.mjs --yes
 *
 * Root cause this cleans up after: the AI-import publish flow never geocoded
 * `address` into lat/lng (see publish-validation.ts / ClaimReview.tsx fix),
 * and separately the AI sometimes wrote a partial/placeholder value into
 * `address` (e.g. "2650 [Street unknown], Ann Arbor, MI") instead of leaving
 * it null. Both leave a live listing with no map location.
 *
 * This script only fixes the first kind — a real, complete address that
 * simply never got geocoded. It queries the same Nominatim endpoint
 * AddressAutocomplete uses, and ONLY writes lat/lng when Nominatim returns a
 * single confident match. Anything ambiguous or a placeholder-looking
 * address (bracketed text, "unknown", etc.) is skipped and reported instead
 * of guessed — those need a human (the supplier, via Edit listing, or an
 * admin) to pick the real address themselves.
 */
import { serviceClient, assertSchemaReady } from './_seedShared.mjs'

const dryRun = !process.argv.includes('--yes')

const PLACEHOLDER_RE = /\[.*?\]|unknown|tbd|n\/a/i

async function geocode(address) {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: '3',
    countrycodes: 'us',
    viewbox: '-83.85,42.36,-83.60,42.18', // Ann Arbor area
    bounded: '0',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Wroomly listing geocode backfill' },
  })
  if (!res.ok) return { ok: false, reason: `Nominatim HTTP ${res.status}` }
  const results = await res.json()
  const feats = (results ?? []).filter(r => r && !isNaN(parseFloat(r.lat)) && !isNaN(parseFloat(r.lon)))
  if (feats.length === 0) return { ok: false, reason: 'no matches' }
  if (feats.length > 1) return { ok: false, reason: `${feats.length} ambiguous matches` }
  const [r] = feats
  return { ok: true, lat: parseFloat(r.lat), lng: parseFloat(r.lon), matched: r.display_name }
}

async function main() {
  const db = serviceClient()
  await assertSchemaReady(db)

  const { data, error } = await db
    .from('listings')
    .select('id, title, address, lat, lng, status')
    .eq('source', 'user')
    .or('lat.is.null,lng.is.null')
    .not('address', 'is', null)

  if (error) throw error
  const candidates = (data ?? []).filter(l => l.address && l.address.trim().length > 0)

  if (candidates.length === 0) {
    console.log('Nothing to backfill — every user listing with an address already has coordinates.')
    return
  }

  console.log(`Found ${candidates.length} listing(s) with an address but no coordinates.\n`)

  let fixed = 0
  let skipped = 0
  for (const l of candidates) {
    if (PLACEHOLDER_RE.test(l.address)) {
      console.log(`SKIP  ${l.id}  "${l.title}"`)
      console.log(`      address looks like a placeholder, not geocoding: "${l.address}"`)
      console.log(`      → needs a human to re-pick the real address (Edit listing).\n`)
      skipped++
      continue
    }

    const geo = await geocode(l.address)
    if (!geo.ok) {
      console.log(`SKIP  ${l.id}  "${l.title}"`)
      console.log(`      "${l.address}" — ${geo.reason}, not confident enough to auto-fix.\n`)
      skipped++
      continue
    }

    console.log(`${dryRun ? 'WOULD FIX' : 'FIX'}  ${l.id}  "${l.title}"`)
    console.log(`      "${l.address}" → (${geo.lat}, ${geo.lng})  [matched: ${geo.matched}]`)

    if (!dryRun) {
      const { error: updateErr } = await db
        .from('listings')
        .update({ lat: geo.lat, lng: geo.lng })
        .eq('id', l.id)
      if (updateErr) {
        console.error(`      UPDATE FAILED: ${updateErr.message}\n`)
        skipped++
        continue
      }
    }
    fixed++
    console.log()
    // Be polite to Nominatim's free tier (max ~1 req/sec).
    await new Promise(r => setTimeout(r, 1100))
  }

  console.log(`${dryRun ? '[dry run] ' : ''}Done — ${fixed} fixed, ${skipped} skipped.`)
  if (dryRun) console.log('Re-run with --yes to apply.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
