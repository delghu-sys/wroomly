/**
 * Partner-listing importer. Run with:
 *   node --env-file=.env.local scripts/importPartners.mjs                 (A2, default)
 *   node --env-file=.env.local scripts/importPartners.mjs --file=<name>   (any partner)
 *
 *   npm run partners:import       → A2 Management
 *   npm run partners:import:mr    → MichiganRental
 *
 * Loads a seed-data JSON file as REAL partner listings (source='partner'), owned
 * by a per-partner system user. Unlike seed listings these are kept by the seed
 * teardown, use the partner's own description as-is, and forward inquiries by
 * email (inquiry_email). The owning system account is derived from the data's
 * sourceName, so each partner's listings are owned (and deletable) separately.
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
  uploadPublicImages,
  HAS_MAPBOX,
} from './_listingImport.mjs'

// Which partner file to import. Defaults to A2 for back-compat; pass
// --file=wroomly_michiganrental_listings.json (or just "michiganrental") for others.
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice('--file='.length)
const DATA_BASENAME = fileArg
  ? fileArg.endsWith('.json')
    ? fileArg
    : `wroomly_${fileArg}_listings.json`
  : 'wroomly_a2_partner_listings.json'
const DATA_FILE = fileURLToPath(new URL(`./seed-data/${DATA_BASENAME}`, import.meta.url))

// The owning system account is derived from the data's sourceName so each
// partner is isolated. Falls back to the A2 account for the legacy file.
function ownerFor(sourceName) {
  const name = sourceName || 'A2 Management'
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return { email: `partner-${slug}@wroomly.app`, name }
}

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

  // Every record in a file should share one sourceName; use the first.
  const partnerOwner = ownerFor(records[0]?.sourceName)
  const ownerId = await ensureSystemUser(db, { email: partnerOwner.email, name: partnerOwner.name })
  const placeholders = await ensurePlaceholders(db)
  console.log(`Partner: ${partnerOwner.name} (owner ${partnerOwner.email}); ${placeholders.length} placeholder images in storage.`)
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

      // Images — use the partner's real photos (images[]) when present, else a
      // neutral placeholder. Real photos are uploaded from /public to storage.
      await db.from('listing_images').delete().eq('listing_id', listingId)
      const localImgs = Array.isArray(r.images) ? r.images.filter(Boolean) : []
      const storagePaths = localImgs.length
        ? await uploadPublicImages(db, localImgs)
        : [placeholders[i % placeholders.length]]
      await db.from('listing_images').insert(
        storagePaths.map((sp, idx) => ({ listing_id: listingId, storage_path: sp, display_order: idx })),
      )
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
