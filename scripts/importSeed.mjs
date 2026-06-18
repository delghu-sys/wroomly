/**
 * Seed-listing importer.  Run with:
 *   node --env-file=.env.local scripts/importSeed.mjs        (npm run seed:import)
 *
 * Reads scripts/seed-data/wroomly_seed_listings.json and loads each record as
 * a real `listings` row tagged source='seed', owned by a dedicated system user.
 * Idempotent: re-running UPDATES the matching seed row (keyed on address +
 * price_per_month) instead of creating duplicates.
 *
 * Uses ONLY the data in the JSON file — nothing is fetched from the source
 * site, and images are local placeholders (see scripts/generateSeedPlaceholders.mjs),
 * never external/copyrighted media.
 *
 * Service-role client → bypasses RLS, so seed rows can be created 'active' and
 * owned by the system user. Nothing here is reachable from the browser.
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  serviceClient,
  assertSchemaReady,
  SEED_SOURCE,
  SEED_USER_EMAIL,
  SEED_USER_NAME,
  PUBLIC_BUCKET,
} from './_seedShared.mjs'
import { buildSeedDescription } from './_seedDescription.mjs'

// Geocoding — turn the real source addresses into lat/lng so the map works.
// Uses your existing Mapbox token. Biased to the Ann Arbor area.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
async function geocode(address, cityRaw) {
  if (!MAPBOX_TOKEN || !address) return null
  const q = encodeURIComponent(`${address}, ${cityRaw || 'Ann Arbor, MI'}`)
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json` +
    `?access_token=${MAPBOX_TOKEN}&limit=1&country=us&proximity=-83.7430,42.2808`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const center = j.features?.[0]?.center
    if (!Array.isArray(center)) return null
    const [lng, lat] = center
    return { lat, lng }
  } catch {
    return null
  }
}

const DATA_FILE = fileURLToPath(new URL('./seed-data/wroomly_seed_listings.json', import.meta.url))
const PLACEHOLDER_DIR = fileURLToPath(new URL('../public/seed-placeholders/', import.meta.url))
const PLACEHOLDER_PREFIX = 'seed-placeholders' // path inside the bucket

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }

function parseAvailableFrom(s) {
  // JSON gives strings like "Aug 17, 2026" (or null). Fall back to today.
  if (s) {
    const m = /([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s)
    if (m) {
      const mon = MONTHS[m[1].toLowerCase()]
      if (mon != null) return new Date(Date.UTC(+m[3], mon, +m[2]))
    }
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}
const iso = d => d.toISOString().slice(0, 10)
function plusMonths(d, n) {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}
function splitCity(raw) {
  // "Ann Arbor, MI" → { city: 'Ann Arbor', state: 'MI' }
  const [city, state] = String(raw ?? '').split(',').map(s => s.trim())
  return { city: city || 'Ann Arbor', state: state || 'MI' }
}

// ── seed system user ───────────────────────────────────────────────────────--
async function ensureSeedUser(db) {
  // Look for the public.users row first.
  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('email', SEED_USER_EMAIL)
    .maybeSingle()
  if (existing?.id) return existing.id

  // Create the auth user (users.id FKs to auth.users.id). If it already exists
  // in auth but not in public.users, find it via the admin list.
  let authId
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: SEED_USER_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: SEED_USER_NAME },
  })
  if (createErr) {
    // Most likely "already registered" — locate the existing auth user.
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.users?.find(u => u.email === SEED_USER_EMAIL)
    if (!found) throw new Error(`Could not create or find seed auth user: ${createErr.message}`)
    authId = found.id
  } else {
    authId = created.user.id
  }

  // Ensure the public.users profile row exists (no auto-create trigger).
  const { error: upsertErr } = await db.from('users').upsert(
    {
      id: authId,
      email: SEED_USER_EMAIL,
      full_name: SEED_USER_NAME,
      user_type: 'supplier',
      university: 'University of Michigan',
      is_verified: true,
    },
    { onConflict: 'id' },
  )
  if (upsertErr) throw new Error(`Could not create seed users row: ${upsertErr.message}`)
  return authId
}

// ── placeholder images → storage ─────────────────────────────────────────────
async function ensurePlaceholders(db) {
  const files = (await readdir(PLACEHOLDER_DIR))
    .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
    .sort()
  if (files.length === 0) {
    throw new Error('No placeholder images in public/seed-placeholders/ — run npm run seed:placeholders')
  }
  const paths = []
  for (const f of files) {
    const buf = await readFile(path.join(PLACEHOLDER_DIR, f))
    const dest = `${PLACEHOLDER_PREFIX}/${f}`
    const contentType = f.endsWith('.png') ? 'image/png' : f.match(/jpe?g$/i) ? 'image/jpeg' : 'image/webp'
    const { error } = await db.storage.from(PUBLIC_BUCKET).upload(dest, buf, { upsert: true, contentType })
    if (error) throw new Error(`Placeholder upload failed (${dest}): ${error.message}`)
    paths.push(dest)
  }
  return paths
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = serviceClient()
  await assertSchemaReady(db)

  const records = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  console.log(`Loaded ${records.length} records from ${path.basename(DATA_FILE)}`)

  const supplierId = await ensureSeedUser(db)
  const placeholders = await ensurePlaceholders(db)
  console.log(`Seed owner ready (${SEED_USER_EMAIL}); ${placeholders.length} placeholder images in storage.`)

  if (!MAPBOX_TOKEN) {
    console.warn('⚠ NEXT_PUBLIC_MAPBOX_TOKEN not set — listings will load without map coordinates.')
  }

  let created = 0
  let updated = 0
  let failed = 0
  let geocoded = 0

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    try {
      const priceCents = Math.round(Number(r.price_per_month) * 100)
      const price = Number.isFinite(priceCents) ? priceCents : null
      const from = parseAvailableFrom(r.available_date)
      const { city, state } = splitCity(r.city)
      const address = r.address ?? null

      // Idempotency key: (source='seed', address, price_per_month). Pull the
      // existing coords too so we don't re-geocode the same address each run.
      const { data: existing } = await db
        .from('listings')
        .select('id, lat, lng')
        .eq('source', SEED_SOURCE)
        .eq('address', address)
        .eq('price_per_month', price)
        .maybeSingle()

      // Geocode the real address only when we don't already have coordinates.
      let lat = existing?.lat ?? null
      let lng = existing?.lng ?? null
      if ((lat == null || lng == null) && address) {
        const c = await geocode(address, r.city)
        if (c) {
          lat = c.lat
          lng = c.lng
          geocoded++
        }
      }

      const row = {
        supplier_id: supplierId,
        type: 'sublet',
        title: r.title,
        description: buildSeedDescription(r), // varied, generated from the data
        address,
        city,
        state,
        lat,
        lng,
        price_per_month: price,
        bedrooms: r.bedrooms ?? null,
        bathrooms: r.bathrooms ?? null,
        available_from: iso(from),
        available_to: iso(plusMonths(from, 12)),
        status: 'active',
        source: SEED_SOURCE,
        source_name: r.sourceName ?? null,
        source_url: r.sourceUrl ?? null,
      }

      let listingId
      if (existing?.id) {
        listingId = existing.id
        const { error } = await db.from('listings').update(row).eq('id', listingId)
        if (error) throw error
        updated++
      } else {
        const { data: ins, error } = await db.from('listings').insert(row).select('id').single()
        if (error) throw error
        listingId = ins.id
        created++
      }

      // Amenities — replace the set each run so re-imports stay in sync.
      await db.from('listing_amenities').delete().eq('listing_id', listingId)
      const amenities = Array.isArray(r.amenities) ? r.amenities.filter(Boolean) : []
      if (amenities.length) {
        await db.from('listing_amenities').insert(
          amenities.map(a => ({ listing_id: listingId, amenity: String(a) })),
        )
      }

      // Image — one round-robin placeholder per listing. Replace seed image
      // each run so it stays consistent with the placeholder set.
      await db.from('listing_images').delete().eq('listing_id', listingId)
      const pick = placeholders[i % placeholders.length]
      await db.from('listing_images').insert({
        listing_id: listingId,
        storage_path: pick,
        display_order: 0,
      })
    } catch (e) {
      failed++
      console.error(`  ✗ "${r.title}" (${r.address}):`, e.message ?? e)
    }
  }

  console.log('\n── Import summary ──')
  console.log(`  created:  ${created}`)
  console.log(`  updated:  ${updated}`)
  console.log(`  geocoded: ${geocoded} (new coordinates this run)`)
  if (failed) console.log(`  failed:   ${failed}`)
  console.log(`  total:    ${records.length}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
