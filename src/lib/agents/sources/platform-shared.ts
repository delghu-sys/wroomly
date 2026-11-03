import { isInServiceArea } from '../../listing-import/publish-validation.ts'

/**
 * Helpers shared by the sources that read a rental PLATFORM's public pages
 * (RotatingRoom, Ohana, SubLeaps), as opposed to a board where residents post.
 *
 * What these platforms have in common, and why their leads look the way they
 * do: nobody publishes an email address or phone number. Contact happens
 * through the platform's own messaging, so a lead is the listing (facts plus a
 * link) and a note on where it can be messaged. The draft and outreach agents
 * skip any lead without an email, so nobody is ever mailed from these sources.
 */

/** Self-identifying, as for every discovery source: a site owner who sees us in
 *  their logs can find out who we are. */
export const PLATFORM_UA = 'WroomlyBot/1.0 (+https://wroomly.app)'

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': PLATFORM_UA, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status} for ${new URL(url).pathname}`)
  return res.text()
}

/** Every `<script type="application/ld+json">` block that parses, flattening
 *  `@graph`. A block that does not parse is ignored, not fatal. */
export function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          if (Array.isArray(o['@graph'])) out.push(...(o['@graph'] as Record<string, unknown>[]))
          else out.push(o)
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

export function ldOfType(html: string, type: string): Record<string, unknown> | undefined {
  return jsonLdBlocks(html).find(b => b['@type'] === type)
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-12-18" (or a full ISO timestamp) → "December 18, 2026", the form the
 *  term parser reads. Null for anything that is not a date. */
export function longDate(iso: unknown): string | null {
  if (typeof iso !== 'string') return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return null
  return `${month} ${Number(m[3])}, ${m[1]}`
}

/** A start and end become a range; only a start becomes "from …". Null when
 *  neither is a date, so an undated listing stays undated (kept, not guessed). */
export function termText(start: unknown, end: unknown): string | null {
  const s = longDate(start)
  const e = longDate(end)
  if (s && e) return `${s} to ${e}`
  if (s) return `from ${s}`
  return null
}

export function priceText(n: unknown): string | null {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN
  if (!Number.isFinite(v) || v <= 0) return null
  return `$${Math.round(v).toLocaleString('en-US')}`
}

const AREA_TOWNS = /^(ann arbor|ypsilanti|saline|dexter|pittsfield|superior|scio|york)\b/i

/** True for a listing in the Ann Arbor area. Coordinates win when the platform
 *  publishes them; otherwise the town name has to be a local one. A listing
 *  with neither is NOT assumed to be local. */
export function inAnnArborArea(city: unknown, lat?: unknown, lng?: unknown): boolean {
  if (typeof lat === 'number' && typeof lng === 'number') return isInServiceArea(lat, lng)
  return typeof city === 'string' && AREA_TOWNS.test(city.trim())
}

/** Description text kept short: it is there for the table's search box and for
 *  a person reading the lead, not to be republished. */
export function shortText(s: unknown, max = 1500): string | undefined {
  if (typeof s !== 'string') return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : undefined
}

/** The fields every platform lead shares. `channel` is the platform key. */
export function platformExtracted(opts: {
  channel: string
  platformName: string
  url: string
  price?: string | null
  dates?: string | null
  postedAt?: string | null
  description?: string
  boardStatus?: string
  beds?: unknown
  baths?: unknown
}): Record<string, unknown> {
  return {
    contactHandle: `Message on ${opts.platformName}`,
    contactChannel: opts.channel,
    contactUrl: opts.url,
    posterType: `${opts.platformName} host`,
    leaseType: 'Sub Lease',
    price: opts.price ?? undefined,
    dates: opts.dates ?? undefined,
    postedAt: opts.postedAt ?? undefined,
    description: opts.description,
    boardStatus: opts.boardStatus,
    beds: typeof opts.beds === 'number' ? opts.beds : undefined,
    baths: typeof opts.baths === 'number' ? opts.baths : undefined,
  }
}
