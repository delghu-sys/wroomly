/**
 * Scrapes CMB Management's 14 buildings on annarborapartments.net (used with
 * their written permission) and writes scripts/seed-data/wroomly_cmb_listings.json
 * — ready for `npm run partners:import:cmb`.
 *
 *   node scripts/scrapeCMB.mjs
 *
 * CMB's site is organized by BUILDING, and each building page shows
 * availability by FLOOR PLAN (e.g. "Studio — $1,600/mo — move-in 8/22/26"),
 * not by individual unit number/address — there is no per-unit "#3"/"#5" like
 * MichiganRental's site exposes. So the unit of import here is one listing per
 * AVAILABLE floor-plan row (confirmed with the user), with the dedup/idempotency
 * key being the building's street address + that floor-plan's label (e.g.
 * "220 N 1st St, Ann Arbor, MI 48104 — Studio"). Rows whose Move-in Date or
 * Notes column says "Fully Leased" are skipped entirely.
 *
 * Deliberately EXCLUDED: the site's "Sublet Availability" page
 * (annarborapartments.net/sublet/) — that page is individual residents'
 * personal sublet posts (their own name + personal email/phone), not CMB's own
 * managed inventory. Importing it under sourceName='CMB Management' would both
 * misattribute the listings and publish private individuals' contact info
 * without their consent. Confirmed excluded with the user.
 *
 * Each building page is WordPress (WPBakery/WP Residence theme). The data is
 * read straight from the rendered HTML — no JS execution needed:
 *   - floor plans: <h3 class="wpb_accordion_header">LABEL</h3> followed by a
 *     <table class="vc-table-plugin-theme-classic_purple"> whose header row
 *     names that table's own columns (they vary per building/table — some omit
 *     Bathrooms or Unit Size, some add a leading "Style" sub-label column).
 *   - description: the og:description meta tag's prose, truncated before the
 *     "Property Features" bullet list (which has no separators in that tag).
 *   - amenities: <div class="listing_detail col-md-4 ..."><i .../>LABEL</div>
 *     checklist items.
 *   - photos: the <ul class="slides">...</ul> gallery's <img src> list (the
 *     plain src is already the largest rendition); falls back to og:image if a
 *     building has no slider gallery.
 *   - street address: the page's own "Address:" contact-info row (more
 *     authoritative than the building list handed to this script, which had at
 *     least one incomplete entry).
 *
 * Each building is geocoded ONCE and that lat/lng is baked into every
 * floor-plan listing under it (the importer also accepts a pre-supplied
 * lat/lng + a separate geocodeAddress field — see importPartners.mjs).
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { geocode, HAS_MAPBOX } from './_listingImport.mjs'

const OUT_FILE = fileURLToPath(new URL('./seed-data/wroomly_cmb_listings.json', import.meta.url))
const REPORT_FILE = fileURLToPath(new URL('./seed-data/wroomly_cmb_report.json', import.meta.url))
const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url))
const PHOTO_PREFIX = 'cmb-photos'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
const SOURCE_NAME = 'CMB Management'
const INQUIRY_EMAIL = 'cmb@annarborapartments.net'

// name → (slug, fallback address) from the handoff JSON. The page's own
// "Address:" field is preferred at scrape time; this is just the fallback.
const BUILDINGS = [
  { name: '220 North First', slug: '220-north-first', fallbackAddress: '220 N First St, Ann Arbor, MI' },
  { name: '820 McKinley', slug: '820-mckinley', fallbackAddress: '820 McKinley Ave, Ann Arbor, MI' },
  { name: '824 McKinley', slug: '824-mckinley', fallbackAddress: '824 McKinley Ave, Ann Arbor, MI' },
  { name: 'Eastwind Apartments', slug: 'eastwind-apartments-2025-s-huron-parkway', fallbackAddress: '2025 S Huron Parkway, Ann Arbor, MI' },
  { name: 'Miller Maple Townhomes', slug: 'miller-maple-townhomes-2505-2563-miller', fallbackAddress: '2505-2563 Miller Ave, Ann Arbor, MI' },
  { name: '801 Miller', slug: '801-miller', fallbackAddress: '801 Miller Ave, Ann Arbor, MI' },
  { name: 'High Street Apartments', slug: 'high-street-545-north-state', fallbackAddress: '608 High Street, Ann Arbor, MI' },
  { name: '712 West Huron', slug: '712-west-huron', fallbackAddress: '712 W Huron St, Ann Arbor, MI' },
  { name: '525 North Division', slug: '525-north-division', fallbackAddress: '525 N Division St, Ann Arbor, MI' },
  { name: '743 Miller', slug: '743-miller', fallbackAddress: '743 Miller Ave, Ann Arbor, MI' },
  { name: '350 Thompson', slug: '350-thompson', fallbackAddress: '350 Thompson St, Ann Arbor, MI' },
  { name: '914 Sylvan', slug: '914-sylvan', fallbackAddress: '914 Sylvan Ave, Ann Arbor, MI' },
  { name: 'Broadview Apartments', slug: 'broadview-1701-1753-broadview-lane', fallbackAddress: '1701 Broadview Lane, Ann Arbor, MI' },
  { name: 'Parkside Apartments', slug: 'parkside-apartments', fallbackAddress: '810 W Huron St, Ann Arbor, MI' },
]

const detailUrl = slug => `https://annarborapartments.net/properties/${slug}/`

// ── HTML helpers ──────────────────────────────────────────────────────────────
const decodeEntities = s =>
  String(s ?? '')
    .replace(/&frac12;/g, '½')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')

const stripTags = s => decodeEntities(String(s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// ── per-building field extraction ────────────────────────────────────────────
function extractDescription(html) {
  const m = html.match(/<meta property="og:description"\s*content="([\s\S]*?)"\s*\/>/)
  if (!m) return ''
  let text = m[1]
  const cut = text.search(/Property Features/i)
  if (cut !== -1) text = text.slice(0, cut)
  return decodeEntities(text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function extractAmenities(html) {
  const out = []
  const re = /<div class="listing_detail col-md-4[^"]*"><i[^>]*><\/i>([^<]+)<\/div>/g
  let m
  while ((m = re.exec(html))) {
    const label = decodeEntities(m[1]).trim().toLowerCase()
    if (label && !out.includes(label)) out.push(label)
  }
  return out
}

function extractPhotos(html) {
  const galleryMatch = html.match(/<ul class="slides">[\s\S]*?<\/ul>/)
  if (galleryMatch) {
    const srcs = [...galleryMatch[0].matchAll(/<img[^>]+src="([^"]+)"/g)]
      .map(m => m[1])
      .filter(u => /\/wp-content\/uploads\//.test(u))
    if (srcs.length) return [...new Set(srcs)]
  }
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)
  return og ? [og[1]] : []
}

function extractAddress(html) {
  const m = html.match(
    /<span class="vc_table_content">Address:<\/span><\/td><td[^>]*><span class="vc_table_content">([\s\S]*?)<\/span>/,
  )
  if (!m) return null
  let addr = stripTags(m[1]).replace(/\s*-\s*Map\b/i, '').trim()
  // "824 McKinley Ann Arbor, MI 48104" → insert the missing comma before the city.
  addr = addr.replace(/\s+(Ann Arbor,?\s*MI)/i, ', $1')
  return addr.replace(/,\s*,/g, ',')
}

// ── floor-plan table parsing ─────────────────────────────────────────────────
const COLUMN_MAP = [
  [/style/i, 'style'],
  [/resident/i, 'residents'],
  [/rent|installment/i, 'priceRaw'],
  [/bedroom/i, 'bedroomsRaw'],
  [/bathroom/i, 'bathroomsRaw'],
  [/size|sq\s*\.?\s*ft/i, 'sqftRaw'],
  [/move-?in/i, 'moveInRaw'],
  [/notes?/i, 'notesRaw'],
]
const fieldFor = header => COLUMN_MAP.find(([re]) => re.test(header))?.[1] ?? null

function cellTexts(rowHtml) {
  return [...rowHtml.matchAll(/<span class="vc_table_content">([\s\S]*?)<\/span>/g)].map(m => stripTags(m[1]))
}

function parseFloorPlanTable(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map(m => m[0])
  if (rows.length < 2) return []
  const headerCells = cellTexts(rows[0])
  const fields = headerCells.map(fieldFor)
  return rows.slice(1).map(rowHtml => {
    const cells = cellTexts(rowHtml)
    const rec = {}
    fields.forEach((f, i) => {
      if (f) rec[f] = cells[i] ?? ''
    })
    return rec
  })
}

function parseBedrooms(rec, heading) {
  if (rec.bedroomsRaw) {
    if (/studio/i.test(rec.bedroomsRaw)) return 0
    const n = parseInt(rec.bedroomsRaw, 10)
    if (Number.isFinite(n)) return n
  }
  if (/studio/i.test(heading)) return 0
  const m = heading.match(/(\d+)\s*bed/i)
  return m ? parseInt(m[1], 10) : null
}

function parseBathrooms(rec) {
  if (!rec.bathroomsRaw) return null
  const m = rec.bathroomsRaw.match(/(\d+)\s*½/) // "1½"
  if (m) return parseInt(m[1], 10) + 0.5
  const n = parseFloat(rec.bathroomsRaw)
  return Number.isFinite(n) ? n : null
}

function parseSqft(rec) {
  if (!rec.sqftRaw) return null
  const n = parseInt(rec.sqftRaw, 10)
  return Number.isFinite(n) ? n : null
}

function isFullyLeased(rec) {
  return /fully\s*leased/i.test(rec.moveInRaw ?? '') || /fully\s*leased/i.test(rec.notesRaw ?? '')
}

function parsePriceLow(priceRaw) {
  const nums = [...priceRaw.matchAll(/[\d,]+(?:\.\d+)?/g)].map(m => Number(m[0].replace(/,/g, '')))
  return nums.length ? Math.min(...nums) : null
}

// Move-in date like "8/22/26" or "7/1/26.8/1/26,8/22/26" (take the first) → Date.
function parseMoveInDate(raw) {
  const m = raw?.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return new Date()
  let [, mo, d, y] = m
  y = y.length === 2 ? `20${y}` : y
  const dt = new Date(Date.UTC(+y, +mo - 1, +d))
  return Number.isNaN(dt.getTime()) ? new Date() : dt
}
const iso = d => d.toISOString().slice(0, 10)
function plusMonths(d, n) {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}

function extractFloorPlans(html) {
  const sections = html.split(/(?=<h3 class="wpb_accordion_header)/)
  const plans = []
  for (const section of sections) {
    const headingMatch = section.match(/<h3 class="wpb_accordion_header[^"]*"><a[^>]*>([\s\S]*?)<\/a><\/h3>/)
    if (!headingMatch) continue
    const heading = stripTags(headingMatch[1])
    // Floor-plan (rate) tables use either the "_purple" or "_default" theme —
    // both have the same "# Of Residents" header shape. The plain "_classic"
    // table (no suffix) is always the Main Office/Address contact-info block.
    const tables =
      section.match(/<table class="vc-table-plugin-theme-(?:classic_purple|default)">[\s\S]*?<\/table>/g) ?? []
    for (const tableHtml of tables) {
      const rows = parseFloorPlanTable(tableHtml)
      const sameHeadingCount = rows.length
      rows.forEach((rec, idx) => {
        plans.push({
          heading,
          label: rec.style ? `${heading} ${rec.style}` : sameHeadingCount > 1 ? `${heading} #${idx + 1}` : heading,
          rec,
        })
      })
    }
  }
  return plans
}

// ── photo download ───────────────────────────────────────────────────────────
function dirSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function downloadPhoto(url, destDir) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/[^a-zA-Z0-9._-]/g, '_')
  await writeFile(path.join(destDir, filename), buf)
  return filename
}

async function main() {
  console.log(`Scraping ${BUILDINGS.length} CMB Management buildings from annarborapartments.net…`)
  if (!HAS_MAPBOX) console.warn('⚠ NEXT_PUBLIC_MAPBOX_TOKEN not set — buildings will geocode without coordinates.')

  const allListings = []
  const perBuilding = []
  const fetchFailed = []

  for (const b of BUILDINGS) {
    try {
      const html = await fetchText(detailUrl(b.slug))
      const address = extractAddress(html) || b.fallbackAddress
      const description = extractDescription(html)
      const amenities = extractAmenities(html)
      const photoUrls = extractPhotos(html)
      const plans = extractFloorPlans(html)

      const available = plans.filter(p => !isFullyLeased(p.rec))
      const leasedCount = plans.length - available.length

      let lat = null
      let lng = null
      const geocodeAddress = address
      const c = await geocode(geocodeAddress, 'Ann Arbor, MI')
      if (c) {
        lat = c.lat
        lng = c.lng
      }

      // Download this building's photos once; every floor-plan listing reuses them.
      let localImages = []
      if (photoUrls.length) {
        const destDirSlug = dirSlug(b.name)
        const destDir = path.join(PUBLIC_ROOT, PHOTO_PREFIX, destDirSlug)
        await mkdir(destDir, { recursive: true })
        for (const url of photoUrls) {
          try {
            const filename = await downloadPhoto(url, destDir)
            localImages.push(`/${PHOTO_PREFIX}/${destDirSlug}/${filename}`)
          } catch (e) {
            console.error(`  ✗ photo ${url} (${b.name}): ${e.message}`)
          }
        }
      }

      const createdHere = []
      for (const plan of available) {
        const { rec, label, heading } = plan
        const bedrooms = parseBedrooms(rec, heading)
        const bathrooms = parseBathrooms(rec)
        const sqft = parseSqft(rec)
        const priceLow = rec.priceRaw ? parsePriceLow(rec.priceRaw) : null
        const moveIn = parseMoveInDate(rec.moveInRaw)
        const isRange = rec.priceRaw && /[\d]\s*-\s*\$?[\d]/.test(rec.priceRaw)

        const descLines = []
        descLines.push(
          `${heading} at ${b.name}. ${isRange ? `Starting at $${priceLow}/mo (${rec.priceRaw.trim()})` : `$${priceLow}/mo`}` +
            (sqft ? `, ${sqft} sq ft` : '') +
            `. Move-in ${rec.moveInRaw || 'available now'}.`,
        )
        if (rec.notesRaw && !isFullyLeased(rec)) descLines.push(rec.notesRaw.trim())
        if (description) descLines.push('', description)

        const title = `${heading} at ${b.name}`
        allListings.push({
          title,
          address: `${address} — ${label}`,
          geocodeAddress,
          city: 'Ann Arbor, MI',
          price_per_month: priceLow,
          bedrooms,
          bathrooms,
          available_date: iso(moveIn),
          available_to: iso(plusMonths(moveIn, 12)),
          description: descLines.filter(Boolean).join('\n'),
          amenities,
          images: localImages,
          lat,
          lng,
          source: 'partner',
          sourceName: SOURCE_NAME,
          sourceUrl: detailUrl(b.slug),
          inquiryEmail: INQUIRY_EMAIL,
        })
        createdHere.push(title)
      }

      perBuilding.push({
        building: b.name,
        address,
        floorPlansFound: plans.length,
        available: available.length,
        fullyLeased: leasedCount,
        photos: localImages.length,
        geocoded: !!c,
        listings: createdHere,
      })
      console.log(
        `  ✓ ${b.name}: ${available.length} available / ${plans.length} floor plan(s), ${localImages.length} photos`,
      )
    } catch (e) {
      fetchFailed.push(`${b.name}: ${e.message}`)
      console.error(`  ✗ ${b.name}: ${e.message}`)
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(allListings, null, 2) + '\n')

  const report = {
    generatedAt: new Date().toISOString(),
    totalBuildings: BUILDINGS.length,
    totalListingsCreated: allListings.length,
    perBuilding,
    fetchFailed,
    excludedFromImport: {
      page: 'https://annarborapartments.net/sublet/',
      reason:
        "Individual residents' personal sublet posts (their own name + personal email/phone) — not CMB's own inventory. Excluded to avoid misattribution and publishing private contact info without consent.",
    },
  }
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + '\n')

  console.log('\n── Scrape summary ──')
  for (const b of perBuilding) console.log(`  ${b.building}: ${b.available} created`)
  console.log(`  TOTAL: ${allListings.length} listings across ${perBuilding.length}/${BUILDINGS.length} buildings`)
  if (fetchFailed.length) console.log(`  fetch failed: ${fetchFailed.length} → see report`)
  console.log(`  report written: ${path.basename(REPORT_FILE)}`)
  console.log('\nNext: npm run partners:import:cmb')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
