/**
 * Enriches scripts/seed-data/wroomly_michiganrental_listings.json with real data
 * pulled from michiganrental.com (a Wix site), used with MichiganRental's written
 * permission (see permission note in the original handoff).
 *
 *   node scripts/scrapeMichiganRental.mjs --match-only   (just report URL matches)
 *   node scripts/scrapeMichiganRental.mjs                (fetch + download photos)
 *
 * How it works:
 *   1. Pull the site's dynamic listings sitemap → every /all-properties-listings/
 *      <uuid>/<address-slug> detail URL.
 *   2. Match each of our 112 addresses to a detail URL by a normalized address
 *      signature (street number + street name + unit), tolerating the slug's
 *      "unit2" / "%231" / "-2" variations.
 *   3. Fetch each matched page and read its embedded `wix-warmup-data` JSON, which
 *      carries the full record: bedrooms, bathrooms, marketingDescription, the
 *      photo list, etc. (No fragile HTML scraping — this is the same data Wix uses
 *      to render the page.)
 *   4. Confirm null bed/bath values, set the real description, and download every
 *      photo to public/michiganrental-photos/<slug>/, then point images[] at them.
 *   5. Write the enriched JSON back and report any listing whose page wasn't found.
 *
 * After this, run `npm run partners:import:mr` to push them to Supabase.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DATA_FILE = fileURLToPath(new URL('./seed-data/wroomly_michiganrental_listings.json', import.meta.url))
const REPORT_FILE = fileURLToPath(new URL('./seed-data/wroomly_michiganrental_report.json', import.meta.url))
const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url))
const PHOTO_PREFIX = 'michiganrental-photos'
const SITEMAP_URL =
  'https://www.michiganrental.com/dynamic-all-properties-listings_p_d0f971e1_b5b8_4de1_9ecd_d85b2300fa08_0_5000-sitemap.xml'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

const MATCH_ONLY = process.argv.includes('--match-only')

// ── address normalization ────────────────────────────────────────────────────
// Collapse an address (ours) or a URL slug (theirs) to a comparable signature
// like "110|nthayer|2". Street-type suffixes are dropped on both sides so
// "423 High St" matches the slug "423-high".
const STREET_SUFFIX = /\b(st|street|ave|avenue|dr|drive|rd|road|blvd|ln|lane|ct|court|pl|place|ter|terrace|way|cir|circle)\b/g

function tokenize(raw) {
  let s = raw
  try {
    s = decodeURIComponent(s)
  } catch {
    /* leave as-is if it isn't valid percent-encoding */
  }
  s = s.toLowerCase().replace(/~/g, '')
  s = s.replace(/[#]/g, ' ') // "#5" → " 5"
  s = s.replace(/[-_/]+/g, ' ') // slug separators → spaces
  // Unit markers, including the slug's glued forms ("unit2", "apt5", "unitb",
  // and even no-hyphen runs like "stateunit1"). The id-bearing pass needs no
  // leading word boundary so it also splits a unit glued onto the street name.
  s = s.replace(/(?:unit|apt|apartment|ste|suite)(\d+|[a-z])(?![a-z0-9])/g, ' $1')
  s = s.replace(/\b(?:unit|apt|apartment|ste|suite|number|no)(?=\d|[a-z]\b)\s*/g, ' ')
  s = s.replace(/\b(?:unit|apt|apartment|ste|suite|number|no)\b/g, ' ')
  s = s.replace(STREET_SUFFIX, ' ')
  s = s.replace(/[^a-z0-9.]+/g, ' ')
  return s.trim().split(/\s+/).filter(Boolean)
}

function signature(raw) {
  const toks = tokenize(raw)
  if (toks.length === 0) return null
  const number = toks[0] // leading street number (may be "337.5")
  // Unit = trailing token that is a bare number or a single letter (e.g. "b").
  // Everything between the number and the unit is the street name.
  let unit = ''
  let nameEnd = toks.length
  const last = toks[toks.length - 1]
  if (toks.length > 2 && (/^\d+$/.test(last) || /^[a-z]$/.test(last))) {
    unit = last
    nameEnd = toks.length - 1
  }
  const name = toks.slice(1, nameEnd).join('')
  return { key: `${number}|${name}|${unit}`, number, name, unit }
}

// ── sitemap → detail URLs ────────────────────────────────────────────────────
async function loadSitemapIndex() {
  const res = await fetch(SITEMAP_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`)
  const xml = await res.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  // index: signature.key → [urls]
  const index = new Map()
  for (const url of locs) {
    const m = url.match(/\/all-properties-listings\/[0-9a-f-]{36}\/(.+)$/i)
    if (!m) continue
    const sig = signature(m[1])
    if (!sig) continue
    const arr = index.get(sig.key) ?? []
    arr.push(url)
    index.set(sig.key, arr)
  }
  return { index, total: locs.length }
}

// ── wix warmup record extraction ─────────────────────────────────────────────
function extractRecord(html) {
  const m = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  let data
  try {
    data = JSON.parse(m[1])
  } catch {
    return null
  }
  // Find recordsByCollectionId.AllPropertiesListings.<uuid> anywhere in the blob.
  let found = null
  const walk = node => {
    if (found || !node || typeof node !== 'object') return
    if (node.recordsByCollectionId?.AllPropertiesListings) {
      const items = node.recordsByCollectionId.AllPropertiesListings
      const first = Object.values(items)[0]
      if (first) found = first
      return
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) walk(v)
  }
  walk(data)
  return found
}

const stripHtml = s =>
  String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function amenitiesFrom(rec) {
  const raw = stripHtml(rec.amenities1 || rec.amenities || '')
  return raw
    .split(/[.,\n]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s && s.length < 40)
}

function photoSlugs(rec) {
  const out = []
  const push = slug => {
    if (slug && !out.includes(slug)) out.push(slug)
  }
  // mainPropertyImage first (it's the cover), then the gallery array.
  const mainSlug = String(rec.mainPropertyImage ?? '').match(/wix:image:\/\/v1\/([^/]+)\//)?.[1]
  push(mainSlug)
  if (Array.isArray(rec.image)) {
    for (const img of rec.image) {
      const slug = img?.slug || String(img?.src ?? '').match(/wix:image:\/\/v1\/([^/]+)\//)?.[1]
      // Skip obvious non-photos (floor-plan pngs are tiny labelled assets).
      push(slug)
    }
  }
  return out
}

const fileNameFromSlug = slug => {
  // "73ddc6_259c4991...~mv2.jpg" → keep extension, use the hash as a stable name.
  const ext = (slug.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg').toLowerCase()
  const base = slug.replace(/~mv2.*/i, '').replace(/[^a-z0-9_]/gi, '')
  return `${base}.${ext}`
}

function dirSlug(address) {
  return address
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function downloadPhoto(slug, destDir) {
  // Request a max-1600px rendition rather than the multi-MB camera original —
  // plenty for card galleries and the detail page, ~8× smaller on disk/storage.
  const filename = fileNameFromSlug(slug)
  const url = `https://static.wixstatic.com/media/${slug}/v1/fit/w_1600,h_1600,q_85/${filename}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`photo HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(path.join(destDir, filename), buf)
  return filename
}

// Run an async mapper over items with a small concurrency cap (be polite).
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  const records = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  console.log(`Loaded ${records.length} listings from the seed file.`)

  const { index, total } = await loadSitemapIndex()
  console.log(`Sitemap: ${total} detail URLs, ${index.size} unique address signatures.`)

  // ── Phase 1: match each listing to a detail URL ──
  const unmatched = []
  const ambiguous = []
  for (const r of records) {
    const sig = signature(r.address)
    let hits = sig ? index.get(sig.key) : null
    // Fallback: MichiganRental sometimes publishes "#1"/the only unit as the
    // unit-less base page (e.g. "314 E William #1" → slug "314-e-william").
    // Only fire for unit "1" (or no unit) and only when exactly one base page
    // exists, so it can't grab the wrong unit.
    if ((!hits || hits.length === 0) && sig && (sig.unit === '1' || sig.unit === '')) {
      const baseHits = index.get(`${sig.number}|${sig.name}|`)
      if (baseHits && baseHits.length === 1) hits = baseHits
    }
    if (!hits || hits.length === 0) {
      r._detailUrl = null
      unmatched.push(r.address)
    } else {
      r._detailUrl = hits[0]
      if (hits.length > 1) ambiguous.push(`${r.address} → ${hits.length} candidates`)
    }
  }
  const matched = records.filter(r => r._detailUrl)
  console.log(`Matched ${matched.length}/${records.length} to a source page.`)
  if (ambiguous.length) console.log(`  (${ambiguous.length} had multiple candidates; took the first)`)
  if (unmatched.length) {
    console.log(`Unmatched (${unmatched.length}):`)
    for (const a of unmatched) console.log(`  ✗ ${a}`)
  }

  if (MATCH_ONLY) {
    console.log('\n--match-only: stopping before any fetch/download.')
    return
  }

  // ── Phase 2: fetch each matched page, parse the record, download photos ──
  let enriched = 0
  let bedsFixed = 0
  let bathsFixed = 0
  let photoCount = 0
  const fetchFailed = []
  const noPhotos = []

  await mapLimit(matched, 5, async r => {
    try {
      const html = await fetchText(r._detailUrl)
      const rec = extractRecord(html)
      if (!rec) throw new Error('no warmup record')

      // Confirm beds/baths from the source (fills our nulls, corrects mismatches).
      if (typeof rec.bedrooms === 'number') {
        if (r.bedrooms == null && rec.bedrooms != null) bedsFixed++
        r.bedrooms = rec.bedrooms
      }
      if (typeof rec.bathrooms === 'number') {
        if (r.bathrooms == null && rec.bathrooms != null) bathsFixed++
        r.bathrooms = rec.bathrooms
      }

      // Real partner description, used as-is.
      const desc = stripHtml(rec.marketingDescription || rec.shortDescription || rec.shortDescriptionAlt || '')
      if (desc) r.description = desc

      const amen = amenitiesFrom(rec)
      if (amen.length) r.amenities = amen

      // Point source_url at the real detail page (better than the generic map).
      r.sourceUrl = r._detailUrl

      // Photos → public/michiganrental-photos/<slug>/
      const slugs = photoSlugs(rec)
      if (slugs.length === 0) {
        noPhotos.push(r.address)
      } else {
        const destDirSlug = dirSlug(r.address)
        const destDir = path.join(PUBLIC_ROOT, PHOTO_PREFIX, destDirSlug)
        await mkdir(destDir, { recursive: true })
        const localPaths = []
        for (const slug of slugs) {
          try {
            const filename = await downloadPhoto(slug, destDir)
            localPaths.push(`/${PHOTO_PREFIX}/${destDirSlug}/${filename}`)
            photoCount++
          } catch (e) {
            console.error(`  ✗ photo ${slug} (${r.address}): ${e.message}`)
          }
        }
        if (localPaths.length) r.images = localPaths
        else noPhotos.push(r.address)
      }

      enriched++
      console.log(`  ✓ ${r.address}  (${r.bedrooms ?? '?'}bd/${r.bathrooms ?? '?'}ba, ${r.images.length} photos)`)
    } catch (e) {
      fetchFailed.push(`${r.address}: ${e.message}`)
      console.error(`  ✗ ${r.address}: ${e.message}`)
    }
  })

  // Strip the internal helper field before writing back.
  for (const r of records) delete r._detailUrl
  await writeFile(DATA_FILE, JSON.stringify(records, null, 2) + '\n')

  const report = {
    generatedAt: new Date().toISOString(),
    total: records.length,
    matched: matched.length,
    enriched,
    bedroomsConfirmed: bedsFixed,
    bathroomsConfirmed: bathsFixed,
    photosDownloaded: photoCount,
    unmatched,
    fetchFailed,
    noPhotos,
  }
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + '\n')

  console.log('\n── Scrape summary ──')
  console.log(`  enriched:           ${enriched}/${records.length}`)
  console.log(`  bedrooms confirmed: ${bedsFixed} (were null)`)
  console.log(`  bathrooms confirmed:${bathsFixed} (were null)`)
  console.log(`  photos downloaded:  ${photoCount}`)
  if (unmatched.length) console.log(`  source page NOT found: ${unmatched.length} → see report`)
  if (fetchFailed.length) console.log(`  fetch failed:       ${fetchFailed.length} → see report`)
  if (noPhotos.length) console.log(`  no photos found:    ${noPhotos.length} → see report`)
  console.log(`  report written:     ${path.basename(REPORT_FILE)}`)
  console.log('\nNext: npm run partners:import:mr')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
