/**
 * When overnight sends go out, by recipient country. Pure and dependency-free,
 * so the dashboard (browser) and the server compute exactly the same times, and
 * every rule is unit-tested.
 *
 * The aim: land in an exchange office's inbox at the start of THEIR working
 * day. Each message is sent so it arrives at 9:00 in the recipient's own time
 * zone, on a Tuesday, Wednesday or Thursday (a working day in every country we
 * write to, and never the Monday backlog or the Friday wind-down). Messages are
 * spaced three minutes apart so a batch never arrives as a blast.
 */

/** Where the operator is. Used for display, and for a country we cannot place. */
export const SEND_TZ = 'America/Detroit'
/** 2:30 AM in SEND_TZ: the fallback for a country with no known time zone. */
export const FALLBACK_HOUR = 2
export const FALLBACK_MINUTE = 30
/** Local time a message should arrive at. */
export const LOCAL_HOUR = 9
export const LOCAL_MINUTE = 0
/** Tuesday, Wednesday, Thursday (0 = Sunday). */
export const SEND_WEEKDAYS: readonly number[] = [2, 3, 4]
/** Minutes between any two messages. */
export const SEND_INTERVAL_MIN = 3
/** A start time closer than this is pushed to the next allowed day: Resend
 *  needs a time that is still in the future when the request arrives. */
export const MIN_LEAD_MS = 10 * 60_000
/** A batch that would run past this local hour moves to the next allowed day. */
export const LATEST_LOCAL_HOUR = 12

/** One main zone per country. A country spanning several zones takes the one
 *  its universities sit in. Keys are lowercase. */
export const COUNTRY_TZ: Record<string, string> = {
  australia: 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland',
  austria: 'Europe/Vienna',
  belgium: 'Europe/Brussels',
  brazil: 'America/Sao_Paulo',
  canada: 'America/Toronto',
  chile: 'America/Santiago',
  china: 'Asia/Shanghai',
  colombia: 'America/Bogota',
  croatia: 'Europe/Zagreb',
  'czech republic': 'Europe/Prague',
  czechia: 'Europe/Prague',
  denmark: 'Europe/Copenhagen',
  egypt: 'Africa/Cairo',
  estonia: 'Europe/Tallinn',
  finland: 'Europe/Helsinki',
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  ghana: 'Africa/Accra',
  greece: 'Europe/Athens',
  'hong kong': 'Asia/Hong_Kong',
  hungary: 'Europe/Budapest',
  iceland: 'Atlantic/Reykjavik',
  india: 'Asia/Kolkata',
  indonesia: 'Asia/Jakarta',
  ireland: 'Europe/Dublin',
  israel: 'Asia/Jerusalem',
  italy: 'Europe/Rome',
  japan: 'Asia/Tokyo',
  kenya: 'Africa/Nairobi',
  latvia: 'Europe/Riga',
  lithuania: 'Europe/Vilnius',
  luxembourg: 'Europe/Luxembourg',
  malaysia: 'Asia/Kuala_Lumpur',
  mexico: 'America/Mexico_City',
  netherlands: 'Europe/Amsterdam',
  nigeria: 'Africa/Lagos',
  norway: 'Europe/Oslo',
  pakistan: 'Asia/Karachi',
  peru: 'America/Lima',
  philippines: 'Asia/Manila',
  poland: 'Europe/Warsaw',
  portugal: 'Europe/Lisbon',
  romania: 'Europe/Bucharest',
  singapore: 'Asia/Singapore',
  slovenia: 'Europe/Ljubljana',
  'south africa': 'Africa/Johannesburg',
  'south korea': 'Asia/Seoul',
  korea: 'Asia/Seoul',
  spain: 'Europe/Madrid',
  sweden: 'Europe/Stockholm',
  switzerland: 'Europe/Zurich',
  taiwan: 'Asia/Taipei',
  thailand: 'Asia/Bangkok',
  turkey: 'Europe/Istanbul',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  vietnam: 'Asia/Ho_Chi_Minh',
}

/** The time zone for a country name as written in the data, or null. */
export function tzForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  const c = country.trim().toLowerCase()
  if (COUNTRY_TZ[c]) return COUNTRY_TZ[c]
  // "Hong Kong SAR, China" and similar.
  if (c.startsWith('hong kong')) return COUNTRY_TZ['hong kong']
  return null
}

type Parts = { y: number; mo: number; d: number; h: number; mi: number; s: number }

function partsIn(tz: string, instant: number): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  })
  const v: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(instant))) if (p.type !== 'literal') v[p.type] = Number(p.value)
  return { y: v.year, mo: v.month, d: v.day, h: v.hour, mi: v.minute, s: v.second }
}

/** Milliseconds the zone is ahead of UTC at that instant (negative in the US). */
function offsetMs(tz: string, instant: number): number {
  const p = partsIn(tz, instant)
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(instant / 1000) * 1000
}

/** The UTC instant at which the wall clock in `tz` reads y-mo-d h:mi. */
function zonedToUtc(tz: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let utc = wall - offsetMs(tz, wall)
  utc = wall - offsetMs(tz, utc) // second pass settles a daylight-saving change
  return utc
}

/**
 * The next time the wall clock in `tz` reads hour:minute on one of `weekdays`,
 * at least `leadMs` after `after`.
 */
export function nextLocalStart(
  after: Date,
  tz: string,
  { hour = LOCAL_HOUR, minute = LOCAL_MINUTE, weekdays = SEND_WEEKDAYS, leadMs = MIN_LEAD_MS }: { hour?: number; minute?: number; weekdays?: readonly number[]; leadMs?: number } = {},
): Date {
  const t = partsIn(tz, after.getTime())
  for (let add = 0; add < 21; add++) {
    // Date.UTC normalises d + add across month ends.
    const day = new Date(Date.UTC(t.y, t.mo - 1, t.d + add))
    if (!weekdays.includes(day.getUTCDay())) continue
    const at = zonedToUtc(tz, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, minute)
    if (at - after.getTime() >= leadMs) return new Date(at)
  }
  throw new Error('Could not work out the next send time.')
}

export interface Slot {
  at: Date
  /** The zone the time was chosen in, for display. */
  tz: string
  /** True when the country is unknown and the 2:30 AM Michigan fallback was used. */
  fallback: boolean
}

/**
 * The send time for one message to `country`: the next allowed 9:00 there, moved
 * later in three-minute steps until no other message (already scheduled, or just
 * placed) is within three minutes of it. A batch that would run past midday
 * moves to the next allowed day instead of arriving in the afternoon.
 *
 * `taken` holds the times (ms) of messages already placed; the caller adds the
 * returned time to it once the message is really scheduled.
 */
export function pickSlot(now: Date, country: string | null | undefined, taken: readonly number[], intervalMin = SEND_INTERVAL_MIN): Slot {
  const known = tzForCountry(country)
  const tz = known ?? SEND_TZ
  const opts = known ? {} : { hour: FALLBACK_HOUR, minute: FALLBACK_MINUTE }
  const step = intervalMin * 60_000
  let cand = nextLocalStart(now, tz, opts).getTime()
  for (let guard = 0; guard < 5000; guard++) {
    const clash = taken.find(t => Math.abs(t - cand) < step)
    if (clash === undefined) {
      const p = partsIn(tz, cand)
      if (known && p.h >= LATEST_LOCAL_HOUR) {
        cand = nextLocalStart(new Date(cand), tz, opts).getTime()
        continue
      }
      return { at: new Date(cand), tz, fallback: !known }
    }
    cand = clash + step
  }
  throw new Error('Could not find a free send time.')
}

export interface PlannedSend {
  id: string
  country: string | null
  slot: Slot
}

/** Place a list of messages in order. Used by the dashboard to preview what a
 *  click will do; the server places messages one at a time with the same rule. */
export function planSends(now: Date, items: { id: string; country: string | null }[], alreadyScheduled: readonly number[] = []): PlannedSend[] {
  const taken = [...alreadyScheduled]
  const out: PlannedSend[] = []
  for (const it of items) {
    const slot = pickSlot(now, it.country, taken)
    taken.push(slot.at.getTime())
    out.push({ id: it.id, country: it.country, slot })
  }
  return out
}

export interface CountryGroup {
  country: string
  count: number
  tz: string
  first: Date
  last: Date
  fallback: boolean
}

/** One line per country: how many, and the first and last time. */
export function groupByCountry(plan: PlannedSend[]): CountryGroup[] {
  const groups = new Map<string, CountryGroup>()
  for (const p of plan) {
    const key = p.country ?? 'Unknown country'
    const g = groups.get(key)
    if (!g) groups.set(key, { country: key, count: 1, tz: p.slot.tz, first: p.slot.at, last: p.slot.at, fallback: p.slot.fallback })
    else {
      g.count++
      if (p.slot.at < g.first) g.first = p.slot.at
      if (p.slot.at > g.last) g.last = p.slot.at
    }
  }
  return [...groups.values()].sort((a, b) => a.first.getTime() - b.first.getTime())
}

/** "Thu, Nov 5 at 9:00 AM GMT+9", in the given zone. */
export function formatSlot(d: Date, tz = SEND_TZ): string {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d)
  return `${day} at ${time}`
}

/** "9:00 AM", in the given zone, no date. */
export function formatClock(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(d)
}

/** The same time in the operator's zone, to compare with their own clock. */
export function formatHere(d: Date): string {
  return formatSlot(d, SEND_TZ)
}
