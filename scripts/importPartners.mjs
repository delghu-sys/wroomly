/**
 * Partner-listing importer. Run with:
 *   node --env-file=.env.local scripts/importPartners.mjs   (npm run partners:import)
 *
 * Loads scripts/seed-data/wroomly_a2_partner_listings.json as REAL partner
 * listings (source='partner'), owned by a partner system user. Unlike seed
 * listings these are kept by the seed teardown, use the partner's own
 * description as-is, and forward inquiries by email (inquiry_email).
 *
 * Idempotent on ADDRESS (each unit address is unique). Re-running updates the
 * matching partner row. Images are neutral placeholders until the partner
 * provides real photos (drop them in and re-run).
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { serviceClient, PARTNER_SOURCE } from './_seedShared.mjs'
import {
  geocode,
  parseAvailableFrom,
  iso,
  plusMonths,
  splitCity,
  isFurnished,
  ensurePlaceholders,
  ensureSystemUser,
  HAS_MAPBOX,
} from './_listingImport.mjs'

const DATA_FILE = fileURLToPath(new URL('./seed-data/wroomly_a2_partner_listings.json', import.meta.url))
const PARTNER_OWNER = { email: 'partner-a2@wroomly.app', name: 'A2 Management' }

// Fail loudly if migration 019 (partner enum value + inquiry_email) isn't applied.
async function assertPartnerSchema(db) {
  const { error } = await db.from('listings').select('inquiry_email').limit(1)
  if (error && /column .*inquiry_email.* does not exist/i.test(error.message)) {
    console.error(
      '\n✗ The `listings.inquiry_email` column is missing. Apply migration 019 in the\n' +
        '  Supabase SQL Editor first (supabase/migrations/019_partner_listings.sql).\n',
    )
    process.exit(1)
  }
  if (error) {
    console.error('Unexpected error checking schema:', error.message)
    process.exit(1)
  }
}

async function main() {
  const db = serviceClient()
  await assertPartnerSchema(db)

  const records = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  console.log(`Loaded ${records.length} partner records from ${path.basename(DATA_FILE)}`)

  const ownerId = await ensureSystemUser(db, { email: PARTNER_OWNER.email, name: PARTNER_OWNER.name })
  const placeholders = await ensurePlaceholders(db)
  console.log(`Partner owner ready (${PARTNER_OWNER.email}); ${placeholders.length} placeholder images in storage.`)
  if (!HAS_MAPBOX) console.warn('⚠ NEXT_PUBLIC_MAPBOX_TOKEN not set — listings will load without map coordinates.')

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

      // Idempotency key: (source='partner', address). Reuse existing coords.
      const { data: existing } = await db
        .from('listings')
        .select('id, lat, lng')
        .eq('source', PARTNER_SOURCE)
        .eq('address', address)
        .maybeSingle()

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
        supplier_id: ownerId,
        type: 'sublet',
        title: r.title,
        description: r.description ?? null, // real partner copy, used as-is
        address,
        city,
        state,
        lat,
        lng,
        price_per_month: price,
        bedrooms: r.bedrooms ?? null,
        bathrooms: r.bathrooms ?? null,
        furnished: isFurnished(r.amenities),
        available_from: iso(from),
        available_to: iso(plusMonths(from, 12)),
        status: 'active',
        source: PARTNER_SOURCE,
        source_name: r.sourceName ?? null,
        source_url: r.sourceUrl ?? null,
        inquiry_email: r.inquiryEmail ?? null,
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

      // Amenities — replace the set each run.
      await db.from('listing_amenities').delete().eq('listing_id', listingId)
      const amenities = Array.isArray(r.amenities) ? r.amenities.filter(Boolean) : []
      if (amenities.length) {
        await db.from('listing_amenities').insert(
          amenities.map(a => ({ listing_id: listingId, amenity: String(a) })),
        )
      }

      // Image — one round-robin placeholder until A2 provides real photos.
      await db.from('listing_images').delete().eq('listing_id', listingId)
      const pick = placeholders[i % placeholders.length]
      await db.from('listing_images').insert({ listing_id: listingId, storage_path: pick, display_order: 0 })
    } catch (e) {
      failed++
      console.error(`  ✗ "${r.title}" (${r.address}):`, e.message ?? e)
    }
  }

  console.log('\n── Partner import summary ──')
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
