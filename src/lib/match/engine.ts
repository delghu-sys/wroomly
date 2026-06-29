import type { MatchCriteria } from '@/types/database'

/**
 * Wroomly Match — the scoring engine.
 *
 * Pure and dependency-free on purpose: the only import is a type (elided at
 * runtime), so this file runs directly under `node --test` with no path-alias or
 * module resolution. Everything it needs is passed in as plain data.
 *
 * Model: each criterion the renter specified is a HARD filter (a listing that
 * fails any one is not a match at all). Among the listings that clear every
 * filter, a soft 0–1 score ranks fit quality — dominated by how comfortably the
 * price sits inside the budget. Only matches at or above MATCH_THRESHOLD get
 * emailed.
 */

/** Subset of a listing the engine compares against. Prices in cents. */
export interface MatchableListing {
  id: string
  type: string // 'sublet' | 'swap'
  title: string
  price_per_month: number | null // cents
  bedrooms: number | null
  bathrooms: number | null
  available_from: string // ISO date (YYYY-MM-DD)
  available_to: string // ISO date
  neighborhood: string | null
  furnished: boolean
  pets_allowed: boolean
  amenities: string[]
}

export interface MatchResult {
  pass: boolean
  score: number // 0–1
  reasons: string[]
}

/** Listings priced up to 8% over the stated max still surface (just ranked lower). */
const PRICE_TOLERANCE = 0.08
export const MATCH_THRESHOLD = 0.6

const NO_MATCH: MatchResult = { pass: false, score: 0, reasons: [] }

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function fmtMoney(dollars: number): string {
  return '$' + Math.round(dollars).toLocaleString('en-US')
}

/** Format an ISO date as "Jun 1" without pulling in date-fns. */
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const month = MONTHS[parseInt(m[2], 10) - 1] ?? ''
  return `${month} ${parseInt(m[3], 10)}`
}

function fmtRange(from: string, to: string): string {
  return `${fmtDate(from)}–${fmtDate(to)}`
}

function bedroomLabel(n: number): string {
  return n === 0 ? 'studio' : `${n}-bed`
}

/**
 * Score a single listing against a renter's criteria. Returns whether it passes
 * the hard filters, a 0–1 fit score, and human reason fragments for the email's
 * "why it matched" line.
 */
export function scoreListing(
  listing: MatchableListing,
  c: MatchCriteria,
): MatchResult {
  const reasons: string[] = []

  // Wroomly Match is for renters looking for a place — only rentable sublet
  // supply is relevant. Swaps need something to swap, so they never match.
  if (listing.type !== 'sublet') return NO_MATCH

  let weight = 0
  let earned = 0

  // ── Budget: hard cap (with tolerance) + soft closeness ──
  if (c.budget_max != null || c.budget_min != null) {
    const price = listing.price_per_month
    if (price == null) return NO_MATCH // can't budget-match a priceless sublet
    const dollars = price / 100
    if (c.budget_max != null && dollars > c.budget_max * (1 + PRICE_TOLERANCE))
      return NO_MATCH
    if (c.budget_min != null && c.budget_min > 0 && dollars < c.budget_min * 0.85)
      return NO_MATCH

    weight += 0.4
    let closeness = 1
    if (c.budget_max != null && dollars > c.budget_max) {
      // In the tolerance band above max → taper the score.
      const over = (dollars - c.budget_max) / (c.budget_max * PRICE_TOLERANCE)
      closeness = 1 - Math.min(over, 1) * 0.5
    }
    earned += 0.4 * closeness
    reasons.push(`${fmtMoney(dollars)}/mo`)
  }

  // ── Bedrooms ──
  if (c.bedrooms_min != null) {
    if (listing.bedrooms != null && listing.bedrooms < c.bedrooms_min)
      return NO_MATCH
    weight += 0.15
    earned += 0.15
    if (listing.bedrooms != null) reasons.push(bedroomLabel(listing.bedrooms))
  }

  // ── Bathrooms ──
  if (c.bathrooms_min != null && c.bathrooms_min > 0) {
    if (listing.bathrooms != null && listing.bathrooms < c.bathrooms_min)
      return NO_MATCH
    weight += 0.05
    earned += 0.05
  }

  // ── Dates: listing availability window must overlap the desired window ──
  if (c.date_start) {
    const desiredStart = c.date_start
    const desiredEnd = c.date_end ?? c.date_start
    const overlaps =
      listing.available_from <= desiredEnd && listing.available_to >= desiredStart
    if (!overlaps) return NO_MATCH
    weight += 0.2
    earned += 0.2
    reasons.push(`available ${fmtRange(listing.available_from, listing.available_to)}`)
  }

  // ── Location ──
  if (c.neighborhoods.length > 0) {
    if (!listing.neighborhood || !c.neighborhoods.includes(listing.neighborhood))
      return NO_MATCH
    weight += 0.2
    earned += 0.2
    reasons.push(`in ${listing.neighborhood}`)
  }

  // ── Furnished ──
  if (c.furnished === true) {
    if (!listing.furnished) return NO_MATCH
    weight += 0.05
    earned += 0.05
    reasons.push('furnished')
  }

  // ── Pets ──
  if (c.pets_required === true) {
    if (!listing.pets_allowed) return NO_MATCH
    weight += 0.05
    earned += 0.05
    reasons.push('pet-friendly')
  }

  // ── Amenities (all required must be present) ──
  if (c.amenities.length > 0) {
    const have = new Set(listing.amenities)
    const missing = c.amenities.filter(a => !have.has(a))
    if (missing.length > 0) return NO_MATCH
    weight += 0.1
    earned += 0.1
    reasons.push(c.amenities.join(', ').toLowerCase())
  }

  // No criteria specified at all → nothing meaningful to match on.
  const score = weight > 0 ? earned / weight : 0
  return { pass: score >= MATCH_THRESHOLD, score, reasons }
}

/**
 * Compose the reason fragments into one "why it matched" sentence for the email.
 * e.g. ["$950/mo", "2-bed", "available Jun 1–Aug 20", "in Kerrytown"] →
 * "$950/mo · 2-bed · available Jun 1–Aug 20 · in Kerrytown".
 */
export function matchReasonLine(reasons: string[]): string {
  return reasons.join(' · ')
}
