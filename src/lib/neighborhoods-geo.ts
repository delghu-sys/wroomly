import { ANN_ARBOR_NEIGHBORHOODS } from './constants'

/**
 * Assign an Ann Arbor listing to a neighborhood from its coordinates.
 *
 * Why coordinates and not the stored `neighborhood` text: almost every
 * listing arrives with real lat/lng (geocoded address) but a null or
 * free-text neighborhood ("Geddes Ave / South University area"). Classifying
 * by coordinates against a fixed set of neighborhood centres gives every
 * geolocated listing a value from the SAME canonical set the filter offers —
 * so a filter click can never land on an empty result again.
 *
 * Nearest-centroid within a max radius. Ann Arbor is compact, so the central
 * cluster is necessarily approximate; that's fine for a browse filter (the
 * goal is a sensible grouping where every option returns listings, not
 * survey-grade boundaries). Outside the radius → null ("just Ann Arbor").
 */

export type Neighborhood = (typeof ANN_ARBOR_NEIGHBORHOODS)[number]

// Approximate centres (lat, lng) for each canonical neighborhood. Tuned
// against the live listing coordinate spread (42.254–42.295, -83.782 to
// -83.692) and known Ann Arbor geography.
const CENTROIDS: Record<Neighborhood, [number, number]> = {
  'Central Campus': [42.2770, -83.7382],
  'North Campus': [42.2915, -83.7160],
  'South University': [42.2745, -83.7325],
  Kerrytown: [42.2855, -83.7440],
  'Old West Side': [42.2775, -83.7560],
  'Burns Park': [42.2670, -83.7300],
  'Water Hill': [42.2880, -83.7530],
  Eberwhite: [42.2710, -83.7640],
  Pittsfield: [42.2510, -83.7010],
  Downtown: [42.2810, -83.7460],
  'Lower Town': [42.2890, -83.7370],
}

// Max distance (km) from a centroid to still count as that neighborhood.
// ~2.2km comfortably covers Ann Arbor's spread without stranding outliers
// (the widest listing is ~4km from downtown and lands in Pittsfield).
const MAX_KM = 2.4

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function classifyNeighborhood(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Neighborhood | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  let best: Neighborhood | null = null
  let bestKm = Infinity
  for (const [name, [cLat, cLng]] of Object.entries(CENTROIDS) as [Neighborhood, [number, number]][]) {
    const km = haversineKm(lat, lng, cLat, cLng)
    if (km < bestKm) {
      bestKm = km
      best = name
    }
  }
  return bestKm <= MAX_KM ? best : null
}
