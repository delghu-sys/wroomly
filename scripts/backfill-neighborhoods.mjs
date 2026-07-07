// One-time backfill: assign every geolocated listing a canonical neighborhood
// from its coordinates (see src/lib/neighborhoods-geo.ts). Idempotent — safe
// to re-run; only writes when the computed value differs from what's stored.
//   node --env-file=.env.local scripts/backfill-neighborhoods.mjs [--dry]
import { createClient } from '@supabase/supabase-js'

// Keep in sync with src/lib/neighborhoods-geo.ts (inlined so the script has
// no build step). If you retune the classifier, retune both.
const CENTROIDS = {
  'Central Campus': [42.2770, -83.7382], 'North Campus': [42.2915, -83.7160],
  'South University': [42.2745, -83.7325], 'Kerrytown': [42.2855, -83.7440],
  'Old West Side': [42.2775, -83.7560], 'Burns Park': [42.2670, -83.7300],
  'Water Hill': [42.2880, -83.7530], 'Eberwhite': [42.2710, -83.7640],
  'Pittsfield': [42.2510, -83.7010], 'Downtown': [42.2810, -83.7460],
  'Lower Town': [42.2890, -83.7370],
}
const MAX_KM = 2.4
function km(aLat, aLng, bLat, bLng) {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLng = (bLng - aLng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
function classify(lat, lng) {
  if (lat == null || lng == null) return null
  let best = null, bk = Infinity
  for (const [n, [cl, cg]] of Object.entries(CENTROIDS)) { const d = km(lat, lng, cl, cg); if (d < bk) { bk = d; best = n } }
  return bk <= MAX_KM ? best : null
}

const dry = process.argv.includes('--dry')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// All listings with coordinates, any status (so archived/rented also get
// consistent values if they ever return to active).
const { data, error } = await db.from('listings').select('id, lat, lng, neighborhood').not('lat', 'is', null)
if (error) { console.error(error); process.exit(1) }

let changed = 0, unchanged = 0, cleared = 0
for (const l of data) {
  const next = classify(l.lat, l.lng)
  if (next === l.neighborhood) { unchanged++; continue }
  if (next === null) {
    // Leave an existing value alone rather than nulling it on an outlier.
    if (l.neighborhood) { unchanged++; continue }
    continue
  }
  if (!dry) {
    const { error: upErr } = await db.from('listings').update({ neighborhood: next }).eq('id', l.id)
    if (upErr) { console.error('update failed', l.id, upErr.message); continue }
  }
  console.log(`${dry ? '[dry] ' : ''}${l.id.slice(0, 8)}  ${JSON.stringify(l.neighborhood)} → ${next}`)
  changed++
}
console.log(`\n${dry ? 'DRY RUN — ' : ''}${changed} updated, ${unchanged} unchanged, of ${data.length} geolocated listings`)
