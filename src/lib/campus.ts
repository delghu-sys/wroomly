/**
 * Walking distance from a listing to campus.
 *
 * This is Wroomly's local edge: a national site can tell you a listing is in
 * "Ann Arbor, MI", but only we can say it's an 11-minute walk to the Diag.
 * Every active listing carries lat/lng (geocoded at publish), so this is
 * computable for essentially the whole inventory.
 *
 * Deliberately dependency-free — imported by client components, so it must
 * not drag zod/date-fns into the browser bundle.
 */

export interface CampusAnchor {
  /** Short label for UI: "the Diag", "North Campus". */
  label: string
  lat: number
  lng: number
}

/**
 * The two anchors students actually measure against. UMich has more named
 * places (Ross, Law Quad, the Med campus) but they all sit within a few
 * minutes of the Diag; North Campus is the only one far enough away to be a
 * genuinely different answer, and it's where Engineering, Music and Art &
 * Design students spend their days.
 */
export const CENTRAL_CAMPUS: CampusAnchor = {
  label: 'the Diag',
  lat: 42.277,
  lng: -83.7382,
}
export const NORTH_CAMPUS: CampusAnchor = {
  label: 'North Campus',
  lat: 42.2912,
  lng: -83.7175,
}

/** Great-circle metres between two points. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
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

/**
 * Effective straight-line metres per minute on foot.
 *
 * Derivation, because getting this wrong means lying to students about how
 * far they'll be walking in February: a normal walking pace is ~5 km/h
 * (83 m/min), and Ann Arbor's street grid means the real walked route runs
 * about 1.3x the straight-line distance. 83 / 1.3 ≈ 64.
 *
 * Sanity check against a published figure: The Yard advertises "0.8 miles,
 * an 18-minute walk" to Central Campus. Straight-line from its address is
 * 994 m, which this constant turns into 16 minutes — close, and erring
 * slightly short of their own number rather than over it.
 */
const WALK_METRES_PER_MIN = 64

/** Past this, "walk time" stops being the useful frame — they'll bus. */
const MAX_SENSIBLE_WALK_MIN = 40

export interface WalkToCampus {
  minutes: number
  anchor: CampusAnchor
  /** Ready-to-render, e.g. "11 min walk to the Diag". */
  label: string
}

/**
 * Nearest-campus walk time for a listing, or null when it can't be computed
 * or wouldn't be useful (no coordinates, or far enough out that walking
 * isn't how anyone would actually get there).
 *
 * Returns the nearer of Central and North Campus rather than always the
 * Diag: a Courtyards listing is a 6-minute walk to North Campus and a
 * 24-minute walk to the Diag, and only the first number answers the
 * question an Engineering student is asking.
 */
export function walkToCampus(
  lat: number | null | undefined,
  lng: number | null | undefined,
): WalkToCampus | null {
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  let best: WalkToCampus | null = null
  for (const anchor of [CENTRAL_CAMPUS, NORTH_CAMPUS]) {
    const minutes = Math.round(
      haversineMeters(lat, lng, anchor.lat, anchor.lng) / WALK_METRES_PER_MIN,
    )
    if (best === null || minutes < best.minutes) {
      best = {
        minutes: Math.max(minutes, 1),
        anchor,
        label: `${Math.max(minutes, 1)} min walk to ${anchor.label}`,
      }
    }
  }

  if (best && best.minutes > MAX_SENSIBLE_WALK_MIN) return null
  return best
}
