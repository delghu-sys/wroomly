/**
 * Shared listing-import helpers used by BOTH the seed importer and the partner
 * importer: geocoding, date/city parsing, placeholder upload, and system-user
 * provisioning. Keeping these in one place means the two importers stay in sync.
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PUBLIC_BUCKET } from './_seedShared.mjs'

// ── geocoding ────────────────────────────────────────────────────────────────
// Turn a real street address into lat/lng so the map works. Uses the existing
// Mapbox token, biased to the Ann Arbor area. Returns null on any failure.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
export const HAS_MAPBOX = !!MAPBOX_TOKEN

export async function geocode(address, cityRaw) {
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

// ── date / city parsing ────────────────────────────────────────────────────--
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }

export function parseAvailableFrom(s) {
  // Strings like "Aug 17, 2026" or "Aug 1 or Aug 15, 2026" (or null) → Date.
  // Falls back to today. For "X or Y" we take the first parseable date.
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

export const iso = d => d.toISOString().slice(0, 10)

export function plusMonths(d, n) {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}

export function splitCity(raw) {
  // "Ann Arbor, MI" → { city: 'Ann Arbor', state: 'MI' }
  const [city, state] = String(raw ?? '').split(',').map(s => s.trim())
  return { city: city || 'Ann Arbor', state: state || 'MI' }
}

export function isFurnished(amenities) {
  return Array.isArray(amenities) && amenities.some(a => /furnish/i.test(String(a)))
}

// ── placeholder images → storage ─────────────────────────────────────────────
const PLACEHOLDER_DIR = fileURLToPath(new URL('../public/seed-placeholders/', import.meta.url))
const PLACEHOLDER_PREFIX = 'seed-placeholders'

export async function ensurePlaceholders(db) {
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

// ── upload local /public images to the public bucket ─────────────────────────
// Takes paths like "/a2-photos/820-fuller/x.jpg" (as stored in a listing's
// images[]), uploads public/<path> to the listing-images bucket under the same
// key, and returns the storage paths for listing_images rows.
export async function uploadPublicImages(db, localPaths) {
  const out = []
  for (const p of localPaths) {
    const rel = p.replace(/^\//, '') // a2-photos/820-fuller/x.jpg
    const abs = fileURLToPath(new URL('../public/' + rel, import.meta.url))
    const buf = await readFile(abs)
    const ext = rel.split('.').pop().toLowerCase()
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const { error } = await db.storage.from(PUBLIC_BUCKET).upload(rel, buf, { upsert: true, contentType })
    if (error) throw new Error(`Image upload failed (${rel}): ${error.message}`)
    out.push(rel)
  }
  return out
}

// ── system user (owns seed / partner listings; supplier_id is NOT NULL) ───────
export async function ensureSystemUser(db, { email, name, university = null }) {
  const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle()
  if (existing?.id) return existing.id

  let authId
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (createErr) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!found) throw new Error(`Could not create or find system user ${email}: ${createErr.message}`)
    authId = found.id
  } else {
    authId = created.user.id
  }

  const { error: upsertErr } = await db.from('users').upsert(
    { id: authId, email, full_name: name, user_type: 'supplier', university, is_verified: true },
    { onConflict: 'id' },
  )
  if (upsertErr) throw new Error(`Could not create users row for ${email}: ${upsertErr.message}`)
  return authId
}
