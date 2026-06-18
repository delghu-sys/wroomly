/**
 * Downloads A2 Management's gallery photos (used with their permission — see the
 * note in wroomly_a2_photos.json) into public/a2-photos/<building-slug>/ keeping
 * the original filenames, then sets each partner listing's images[] to the
 * matching local paths. Floor-plan images are skipped (only listing_galleries).
 *
 *   node scripts/downloadA2Photos.mjs    (npm run partners:photos)
 *
 * The #105 per-room listings reuse the #105 whole-unit gallery (same apartment).
 * After this, run `npm run partners:import` to upload them to storage + attach.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PHOTOS_FILE = fileURLToPath(new URL('./seed-data/wroomly_a2_photos.json', import.meta.url))
const PARTNERS_FILE = fileURLToPath(new URL('./seed-data/wroomly_a2_partner_listings.json', import.meta.url))
const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url))

function slugFor(address) {
  if (/820\s*Fuller/i.test(address)) return '820-fuller'
  if (/915\s*S\.?\s*Division/i.test(address)) return '915-s-division'
  return null
}
const filenameFromUrl = u => decodeURIComponent(u.split('/').pop().split('?')[0])

async function main() {
  const photos = JSON.parse(await readFile(PHOTOS_FILE, 'utf8'))

  // Build the download set (deduped by URL) + address → local paths map.
  const downloads = new Map() // url → { slug, filename }
  const galleryByAddr = {}
  for (const g of photos.listing_galleries) {
    const slug = slugFor(g.address)
    if (!slug) {
      console.warn(`  ? no building slug for "${g.address}" — skipping`)
      continue
    }
    const local = []
    for (const url of g.images) {
      const filename = filenameFromUrl(url)
      downloads.set(url, { slug, filename })
      local.push(`/a2-photos/${slug}/${filename}`)
    }
    galleryByAddr[g.address] = local
  }

  // Download each unique image.
  let ok = 0
  let fail = 0
  for (const [url, { slug, filename }] of downloads) {
    const dir = path.join(PUBLIC_ROOT, 'a2-photos', slug)
    await mkdir(dir, { recursive: true })
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await writeFile(path.join(dir, filename), buf)
      ok++
      console.log(`  ✓ ${slug}/${filename} (${(buf.length / 1024).toFixed(0)}kb)`)
    } catch (e) {
      fail++
      console.error(`  ✗ ${url}: ${e.message}`)
    }
  }

  // Update partner listings images[]. Rooms in #105 reuse the #105 gallery.
  const listings = JSON.parse(await readFile(PARTNERS_FILE, 'utf8'))
  let updated = 0
  for (const l of listings) {
    if (galleryByAddr[l.address]) {
      l.images = galleryByAddr[l.address]
      updated++
    } else if (l.address.includes('#105') && /room/i.test(l.address)) {
      l.images = galleryByAddr['915 S. Division #105'] ?? l.images
      updated++
    }
  }
  await writeFile(PARTNERS_FILE, JSON.stringify(listings, null, 2) + '\n')

  console.log(`\nDownloaded ${ok} image(s)${fail ? `, ${fail} failed` : ''}.`)
  console.log(`Updated images[] on ${updated} listing(s). Now run: npm run partners:import`)
  if (fail) process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
