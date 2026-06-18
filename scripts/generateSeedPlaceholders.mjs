/**
 * Generates a small set of ORIGINAL, royalty-free placeholder images for seed
 * listings into /public/seed-placeholders/. These are authored here (simple
 * gradients + a room label + the Wroomly wordmark) — nothing is downloaded or
 * copied from any external site. The importer uploads them to Supabase storage
 * and round-robins them across seed listings so the cards vary.
 *
 * Raster WebP output (not raw SVG) so next/image renders them with the normal,
 * un-weakened image config. Re-run any time: `npm run seed:placeholders`.
 *
 * Replace these with your own interior photos later by dropping .webp/.jpg
 * files into /public/seed-placeholders/ and re-running the importer.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const OUT_DIR = path.resolve(fileURLToPath(new URL('../public/seed-placeholders/', import.meta.url)))

// Soft, neutral palettes (top → bottom gradient) with a maize accent line.
const TILES = [
  { label: 'Living room', a: '#e9eef5', b: '#cdd8e6' },
  { label: 'Bedroom', a: '#f1ece4', b: '#ddd2c2' },
  { label: 'Kitchen', a: '#e6efe9', b: '#c8ddcf' },
  { label: 'Studio', a: '#efe9f0', b: '#d8c8da' },
  { label: 'Apartment', a: '#eaecf2', b: '#cfd3df' },
  { label: 'Near campus', a: '#f0ece6', b: '#dccdbb' },
]

const W = 1200
const H = 900

function svg({ label, a, b }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <!-- subtle window/room line art -->
  <g fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3">
    <rect x="160" y="210" width="380" height="300" rx="6"/>
    <line x1="350" y1="210" x2="350" y2="510"/>
    <line x1="160" y1="360" x2="540" y2="360"/>
    <rect x="640" y="300" width="400" height="210" rx="10"/>
    <line x1="640" y1="430" x2="1040" y2="430"/>
  </g>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#ffcb05"/>
  <text x="${W / 2}" y="640" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="58" fill="#14213d" fill-opacity="0.82">${label}</text>
  <text x="${W / 2}" y="710" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="26" letter-spacing="6" fill="#14213d" fill-opacity="0.5">WROOMLY</text>
</svg>`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (let i = 0; i < TILES.length; i++) {
    const n = String(i + 1).padStart(2, '0')
    const out = path.join(OUT_DIR, `${n}.webp`)
    await sharp(Buffer.from(svg(TILES[i]))).webp({ quality: 82 }).toFile(out)
    console.log('wrote', out)
  }
  // A tiny manifest so the importer knows the canonical set/order.
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(TILES.map((_, i) => `${String(i + 1).padStart(2, '0')}.webp`), null, 2),
  )
  console.log(`\nGenerated ${TILES.length} placeholders in public/seed-placeholders/`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
