import type {
  MatchAttr,
  MatchProfile,
  MatchReason,
} from '@/types/database'

/**
 * Wroomly Match v2 — the weighted scoring engine.
 *
 * Pure and dependency-free on purpose: the only imports are types (elided at
 * runtime), so this file runs directly under `node --test` with no path-alias
 * or module resolution. Everything it needs is passed in as plain data.
 *
 * Model: scoring, not filtering.
 *   1. Dealbreakers (and intrinsically-hard conditions like a missing required
 *      amenity or a price beyond the stretch ceiling) are hard cuts.
 *   2. Every other attribute earns a 0–1 fraction, weighted by the renter's
 *      stated importance (profile.weights) with a multiplier for their ranked
 *      top-3 priorities.
 *   3. Flexibility is honored: a price in the (max, stretch_max] band takes a
 *      penalty that SHRINKS when the renter's top priorities score strongly —
 *      slightly over budget can still match when everything else is right.
 *   4. Output is a 0–100 score plus machine-readable fit/miss reasons that
 *      feed the personal email notes and the manage page.
 */

/** Subset of a listing the engine compares against. Prices in cents. */
export interface MatchableListing {
  id: string
  type: string
  title: string
  price_per_month: number | null // cents
  bedrooms: number | null
  bathrooms: number | null
  available_from: string // ISO date (YYYY-MM-DD)
  available_to: string // ISO date
  neighborhood: string | null
  lat: number | null
  lng: number | null
  furnished: boolean
  pets_allowed: boolean
  amenities: string[]
}

export interface MatchResult {
  pass: boolean
  score: number // 0–100, integer
  fits: MatchReason[]
  misses: MatchReason[]
}

/** Minimum 0–100 score to email the match. */
export const MATCH_THRESHOLD = 62

/** Priority-rank weight multipliers (most-important first). */
const PRIORITY_BOOST = [1.5, 1.3, 1.15]

/** Effective travel speed by mode, meters/minute, including a 1.3× route
 * factor baked in (straight-line distance × 1.3 ≈ street distance). */
const MODE_SPEED: Record<string, number> = { walk: 80, bike: 240, bus: 130 }

/** An attribute fraction only counts as a "fit" reason at or above this. */
const FIT_BAR = 0.65

const NO_MATCH: MatchResult = { pass: false, score: 0, fits: [], misses: [] }

// ── Small pure helpers ──────────────────────────────────────────────────────

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function fmtMoney(dollars: number): string {
  return '$' + Math.round(dollars).toLocaleString('en-US')
}

function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${MONTHS[parseInt(m[2], 10) - 1] ?? ''} ${parseInt(m[3], 10)}`
}

const DAY_MS = 86_400_000

function days(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? NaN : t / DAY_MS
}

/** Straight-line distance in meters between two lat/lng points. */
export function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Estimated door-to-door minutes from a listing to an anchor by mode. */
export function commuteMinutes(
  meters: number,
  mode: string,
): number {
  const speed = MODE_SPEED[mode] ?? MODE_SPEED.walk
  return meters / speed
}

// ── Per-attribute scoring ───────────────────────────────────────────────────
// Each scorer returns null when the profile doesn't engage that attribute,
// otherwise a 0–1 fraction, a short human detail, and whether the failure is
// intrinsically a hard cut (independent of the dealbreakers list).

interface AttrScore {
  fraction: number
  detail: string
  hardFail?: boolean
}

function scoreBudget(
  l: MatchableListing,
  p: MatchProfile,
  priorityStrength: number,
): AttrScore | null {
  const { min, max, stretch_max } = p.budget
  if (min == null && max == null) return null
  if (l.price_per_month == null)
    return { fraction: 0, detail: 'no price listed' }
  const dollars = l.price_per_month / 100

  // Absolute ceiling: explicit stretch when given, else 8% grace over max.
  const ceiling = max != null ? Math.max(stretch_max ?? 0, max * 1.08) : null
  if (max != null && ceiling != null && dollars > ceiling) {
    return {
      fraction: 0,
      hardFail: true,
      detail: `${fmtMoney(dollars)}/mo is over your ${fmtMoney(ceiling)} ceiling`,
    }
  }

  if (max == null || dollars <= max) {
    // Suspiciously far below range often means a different kind of place.
    if (min != null && min > 0 && dollars < min * 0.85) {
      return { fraction: 0.3, detail: `${fmtMoney(dollars)}/mo — well below your range` }
    }
    return { fraction: 1, detail: `${fmtMoney(dollars)}/mo — inside your budget` }
  }

  // Stretch band (max, ceiling]: base penalty tapers with how deep into the
  // band the price sits, then shrinks when top priorities score strongly.
  const depth = (dollars - max) / (ceiling! - max) // 0..1
  const base = 1 - depth * 0.6
  const fraction = base + (1 - base) * Math.min(Math.max(priorityStrength, 0), 1) * 0.8
  return {
    fraction,
    detail: `${fmtMoney(dollars)}/mo — over your ${fmtMoney(max)} budget but within your stretch`,
  }
}

function scoreLocation(l: MatchableListing, p: MatchProfile): AttrScore | null {
  const { anchors, neighborhoods } = p.location
  if (anchors.length === 0 && neighborhoods.length === 0) return null

  let best: AttrScore | null = null

  // Anchor commutes (needs listing coordinates).
  if (l.lat != null && l.lng != null) {
    for (const a of anchors) {
      const mins = commuteMinutes(haversineMeters(l.lat, l.lng, a.lat, a.lng), a.mode)
      const rounded = Math.max(1, Math.round(mins))
      let fraction: number
      if (mins <= a.max_minutes) fraction = 1
      else if (mins >= a.max_minutes * 1.6) fraction = 0
      else fraction = 1 - (mins - a.max_minutes) / (a.max_minutes * 0.6)
      const detail =
        fraction > 0
          ? `≈${rounded} min ${a.mode} to ${a.name}`
          : `≈${rounded} min ${a.mode} to ${a.name} — past your ${a.max_minutes}-min limit`
      if (!best || fraction > best.fraction) best = { fraction, detail }
    }
  }

  // Neighborhood membership.
  if (neighborhoods.length > 0) {
    const inList = l.neighborhood != null && neighborhoods.includes(l.neighborhood)
    const nScore: AttrScore = inList
      ? { fraction: 1, detail: `in ${l.neighborhood}` }
      : {
          fraction: 0,
          detail: l.neighborhood
            ? `in ${l.neighborhood}, outside your preferred areas`
            : 'neighborhood unknown',
        }
    if (!best || nScore.fraction > best.fraction) best = nScore
  }

  return (
    best ?? { fraction: 0, detail: 'location could not be compared' }
  )
}

function scoreTiming(l: MatchableListing, p: MatchProfile): AttrScore | null {
  const { move_in, move_out, duration_months, flexibility } = p.timing
  if (!move_in) return null

  const start = days(move_in)
  const inferredEnd =
    move_out ??
    (duration_months != null
      ? new Date(Date.parse(move_in) + duration_months * 30 * DAY_MS)
          .toISOString()
          .slice(0, 10)
      : move_in)
  const end = days(inferredEnd)
  const availFrom = days(l.available_from)
  const availTo = days(l.available_to)
  if ([start, end, availFrom, availTo].some(Number.isNaN))
    return { fraction: 0, detail: 'dates could not be compared' }

  const overlap = Math.min(end, availTo) - Math.max(start, availFrom)
  const span = Math.max(end - start, 1)
  const ratio = Math.max(0, Math.min(overlap / span, 1))

  // No overlap at all is useless regardless of flexibility; a rigid renter
  // also needs the window essentially covered.
  if (ratio <= 0) {
    return {
      fraction: 0,
      hardFail: true,
      detail: `available ${fmtDate(l.available_from)} – ${fmtDate(l.available_to)}, outside your window`,
    }
  }
  if (flexibility === 'rigid' && ratio < 0.85) {
    return {
      fraction: ratio,
      hardFail: true,
      detail: `only covers part of your dates (available ${fmtDate(l.available_from)} – ${fmtDate(l.available_to)})`,
    }
  }

  return {
    fraction: ratio,
    detail:
      ratio >= 0.999
        ? `covers your ${fmtDate(move_in)} – ${fmtDate(inferredEnd)} window`
        : `covers most of your dates (available ${fmtDate(l.available_from)} – ${fmtDate(l.available_to)})`,
  }
}

function scoreSpace(l: MatchableListing, p: MatchProfile): AttrScore | null {
  const { bedrooms_min, bathrooms_min } = p.space
  if (bedrooms_min == null && (bathrooms_min == null || bathrooms_min <= 0))
    return null

  const parts: number[] = []
  const bits: string[] = []

  if (bedrooms_min != null) {
    const ok = l.bedrooms != null && l.bedrooms >= bedrooms_min
    parts.push(ok ? 1 : 0)
    bits.push(
      l.bedrooms == null
        ? 'bedrooms unlisted'
        : l.bedrooms === 0
          ? 'studio'
          : `${l.bedrooms} bed`,
    )
  }
  if (bathrooms_min != null && bathrooms_min > 0) {
    const ok = l.bathrooms != null && l.bathrooms >= bathrooms_min
    parts.push(ok ? 1 : 0.5) // a bath short is a caveat, not a disqualifier
    if (l.bathrooms != null) bits.push(`${l.bathrooms} bath`)
  }

  const fraction = parts.reduce((a, b) => a + b, 0) / parts.length
  return {
    fraction,
    detail:
      fraction >= 1
        ? bits.join(', ')
        : `${bits.join(', ')} — smaller than you wanted`,
  }
}

function scoreFurnished(l: MatchableListing, p: MatchProfile): AttrScore | null {
  if (p.furnished !== true) return null
  return l.furnished
    ? { fraction: 1, detail: 'furnished' }
    : { fraction: 0, detail: 'not furnished' }
}

function scorePets(l: MatchableListing, p: MatchProfile): AttrScore | null {
  if (p.pets_required !== true) return null
  return l.pets_allowed
    ? { fraction: 1, detail: 'pet-friendly' }
    : { fraction: 0, detail: 'no pets allowed' }
}

function scoreAmenities(l: MatchableListing, p: MatchProfile): AttrScore | null {
  const { required, preferred } = p.amenities
  if (required.length === 0 && preferred.length === 0) return null
  const have = new Set(l.amenities)

  const missingRequired = required.filter(a => !have.has(a))
  if (missingRequired.length > 0) {
    return {
      fraction: 0,
      hardFail: true, // "required" means required
      detail: `missing ${missingRequired.join(', ').toLowerCase()}`,
    }
  }

  const gotPreferred = preferred.filter(a => have.has(a))
  const prefCoverage =
    preferred.length > 0 ? gotPreferred.length / preferred.length : 1
  // All required present anchors the fraction; preferred coverage fills it out.
  const fraction = required.length > 0 ? 0.6 + prefCoverage * 0.4 : prefCoverage

  const gotAll = [...required, ...gotPreferred]
  const missedPref = preferred.filter(a => !have.has(a))
  const detail =
    gotAll.length > 0
      ? `has ${gotAll.join(', ').toLowerCase()}` +
        (missedPref.length > 0 ? ` (no ${missedPref.join(', ').toLowerCase()})` : '')
      : `no ${missedPref.join(', ').toLowerCase()}`
  return { fraction, detail }
}

// ── Main entry ──────────────────────────────────────────────────────────────

type Scorer = (l: MatchableListing, p: MatchProfile) => AttrScore | null

const SCORERS: [MatchAttr, Scorer][] = [
  ['location', scoreLocation],
  ['timing', scoreTiming],
  ['space', scoreSpace],
  ['furnished', scoreFurnished],
  ['pets', scorePets],
  ['amenities', scoreAmenities],
]

/**
 * Score one listing against a weighted profile. Returns pass/fail, a 0–100
 * score, and machine-readable fit/miss reasons for the email + manage page.
 */
export function scoreListing(
  listing: MatchableListing,
  p: MatchProfile,
): MatchResult {
  // Only rentable sublet supply is relevant to renters.
  if (listing.type !== 'sublet') return NO_MATCH

  const dealbreakerAttrs = new Set(p.dealbreakers.map(d => d.attr))
  const results = new Map<MatchAttr, AttrScore>()
  const fits: MatchReason[] = []
  const misses: MatchReason[] = []

  // Pass 1: everything except budget (budget needs the others' strength).
  for (const [attr, scorer] of SCORERS) {
    const r = scorer(listing, p)
    if (r) results.set(attr, r)
  }

  // Priority strength drives the budget-stretch forgiveness: how well is this
  // listing delivering on what the renter said matters most?
  const strengthAttrs = (
    p.priorities.filter(a => a !== 'budget') as MatchAttr[]
  ).filter(a => results.has(a))
  const pool = strengthAttrs.length > 0 ? strengthAttrs : [...results.keys()]
  const priorityStrength =
    pool.length > 0
      ? pool.reduce((sum, a) => sum + results.get(a)!.fraction, 0) / pool.length
      : 0

  const budget = scoreBudget(listing, p, priorityStrength)
  if (budget) results.set('budget', budget)

  // Hard cuts: intrinsic hard failures, plus any dealbreaker attribute that
  // scored poorly (the renter said it's non-negotiable).
  for (const [attr, r] of results) {
    const dealbreakerFail = dealbreakerAttrs.has(attr) && r.fraction < 0.35
    if (r.hardFail || dealbreakerFail) {
      misses.push({ kind: 'miss', attr, detail: r.detail })
      return { pass: false, score: 0, fits: [], misses }
    }
  }

  // Weighted 0–100 score with priority boosts.
  let totalWeight = 0
  let earned = 0
  for (const [attr, r] of results) {
    const baseWeight = p.weights[attr]
    if (baseWeight == null || baseWeight <= 0) continue
    const rank = p.priorities.indexOf(attr)
    const weight = baseWeight * (rank >= 0 ? PRIORITY_BOOST[rank] ?? 1 : 1)
    totalWeight += weight
    earned += weight * r.fraction

    const reason: MatchReason = {
      kind: r.fraction >= FIT_BAR ? 'fit' : 'miss',
      attr,
      detail: r.detail,
    }
    ;(reason.kind === 'fit' ? fits : misses).push(reason)
  }

  if (totalWeight <= 0) return NO_MATCH

  const score = Math.round((earned / totalWeight) * 100)
  return { pass: score >= MATCH_THRESHOLD, score, fits, misses }
}
