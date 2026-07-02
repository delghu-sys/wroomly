import { z } from 'zod'
import { format, parseISO, isValid } from 'date-fns'
import { AMENITIES, ANN_ARBOR_NEIGHBORHOODS } from '@/lib/constants'
import type {
  MatchAttr,
  MatchCriteria,
  MatchProfile,
} from '@/types/database'

/**
 * Wroomly Match v2 — the weighted profile: shape, validation, gazetteer, and
 * humanization.
 *
 * The profile is produced by the LLM extraction pass over the concierge chat,
 * edited on the manage page, nudged by email feedback, and consumed by the
 * scoring engine. Like v1's criteria schema, every field is forgiving
 * (`.catch`) so a hallucinated value degrades to "no preference" instead of
 * failing the whole save.
 */

const NEIGHBORHOODS = new Set<string>(ANN_ARBOR_NEIGHBORHOODS)
const AMENITY_SET = new Set<string>(AMENITIES)

export const MATCH_ATTRS: MatchAttr[] = [
  'budget',
  'location',
  'timing',
  'space',
  'furnished',
  'pets',
  'amenities',
]
const ATTR_SET = new Set<string>(MATCH_ATTRS)

// ── Campus anchor gazetteer ─────────────────────────────────────────────────
// Places students actually anchor their housing search to. The chat maps the
// renter's words ("I walk to the Chem building", "I'm at Ross every day") to
// the closest anchor; the engine turns listing lat/lng distance into commute
// minutes. Coordinates are the landmark's center — plenty for straight-line
// estimates at neighborhood scale.
export const CAMPUS_ANCHORS: Record<string, { lat: number; lng: number }> = {
  'The Diag / Central Campus': { lat: 42.277, lng: -83.7382 },
  'North Campus': { lat: 42.2912, lng: -83.7175 },
  'Medical Campus': { lat: 42.2846, lng: -83.7306 },
  'Ross School of Business': { lat: 42.2731, lng: -83.7382 },
  'Law Quad': { lat: 42.2743, lng: -83.7396 },
  'CCRB / Hill area': { lat: 42.2781, lng: -83.7327 },
  'South University': { lat: 42.2748, lng: -83.733 },
  'Downtown / Main St': { lat: 42.2808, lng: -83.748 },
  'Michigan Stadium / athletics': { lat: 42.2658, lng: -83.7487 },
}
export const ANCHOR_NAMES = Object.keys(CAMPUS_ANCHORS)

// ── Zod schema ──────────────────────────────────────────────────────────────

const weightSchema = z.number().min(0).max(1)

const anchorSchema = z
  .object({
    name: z.string(),
    max_minutes: z.number().int().min(1).max(120).catch(15),
    mode: z.enum(['walk', 'bike', 'bus']).catch('walk'),
  })
  // Resolve coordinates from the gazetteer; unknown anchor names are dropped
  // (an anchor we can't place can't be scored).
  .transform(a => {
    const coords = CAMPUS_ANCHORS[a.name]
    return coords ? { ...a, lat: coords.lat, lng: coords.lng } : null
  })

export const matchProfileSchema = z
  .object({
    budget: z
      .object({
        min: z.number().int().positive().max(100000).nullable().catch(null),
        max: z.number().int().positive().max(100000).nullable().catch(null),
        stretch_max: z.number().int().positive().max(100000).nullable().catch(null),
        stretch_reason: z.string().max(300).nullable().catch(null),
      })
      .catch({ min: null, max: null, stretch_max: null, stretch_reason: null }),
    timing: z
      .object({
        move_in: z.string().nullable().catch(null),
        move_out: z.string().nullable().catch(null),
        lease_type: z.enum(['sublet', 'full', 'either']).nullable().catch(null),
        duration_months: z.number().int().min(1).max(36).nullable().catch(null),
        flexibility: z.enum(['rigid', 'some', 'flexible']).catch('some'),
      })
      .catch({ move_in: null, move_out: null, lease_type: null, duration_months: null, flexibility: 'some' }),
    space: z
      .object({
        whole_unit: z.boolean().nullable().catch(null),
        bedrooms_min: z.number().int().min(0).max(10).nullable().catch(null),
        bathrooms_min: z.number().min(0).max(10).nullable().catch(null),
        roommates_ok: z.boolean().nullable().catch(null),
        gender_pref: z.string().max(100).nullable().catch(null),
      })
      .catch({ whole_unit: null, bedrooms_min: null, bathrooms_min: null, roommates_ok: null, gender_pref: null }),
    location: z
      .object({
        anchors: z
          .array(anchorSchema)
          .catch([])
          .transform(arr => arr.filter((a): a is NonNullable<typeof a> => a !== null).slice(0, 3)),
        neighborhoods: z
          .array(z.string())
          .catch([])
          .transform(arr => arr.filter(n => NEIGHBORHOODS.has(n))),
      })
      .catch({ anchors: [], neighborhoods: [] }),
    lifestyle: z
      .object({
        tags: z.array(z.string().max(40)).max(10).catch([]),
        notes: z.string().max(500).nullable().catch(null),
      })
      .catch({ tags: [], notes: null }),
    amenities: z
      .object({
        required: z
          .array(z.string())
          .catch([])
          .transform(arr => arr.filter(a => AMENITY_SET.has(a))),
        preferred: z
          .array(z.string())
          .catch([])
          .transform(arr => arr.filter(a => AMENITY_SET.has(a))),
      })
      .catch({ required: [], preferred: [] }),
    furnished: z.boolean().nullable().catch(null),
    pets_required: z.boolean().nullable().catch(null),
    priorities: z
      .array(z.string())
      .catch([])
      .transform(arr => arr.filter(a => ATTR_SET.has(a)).slice(0, 3) as MatchAttr[]),
    dealbreakers: z
      .array(
        z.object({
          attr: z.string(),
          description: z.string().max(300),
        }),
      )
      .catch([])
      .transform(arr =>
        arr
          .filter(d => ATTR_SET.has(d.attr))
          .slice(0, 6) as { attr: MatchAttr; description: string }[],
      ),
    weights: z
      .record(z.string(), weightSchema)
      .catch({})
      .transform(w => {
        const out: Partial<Record<MatchAttr, number>> = {}
        for (const [k, v] of Object.entries(w)) {
          if (ATTR_SET.has(k)) out[k as MatchAttr] = v
        }
        return out
      }),
    summary: z.string().max(2000).nullable().catch(null),
  })
  .transform(p => ({ ...p, version: 2 as const }))

export const EMPTY_PROFILE: MatchProfile = {
  version: 2,
  budget: { min: null, max: null, stretch_max: null, stretch_reason: null },
  timing: { move_in: null, move_out: null, lease_type: null, duration_months: null, flexibility: 'some' },
  space: { whole_unit: null, bedrooms_min: null, bathrooms_min: null, roommates_ok: null, gender_pref: null },
  location: { anchors: [], neighborhoods: [] },
  lifestyle: { tags: [], notes: null },
  amenities: { required: [], preferred: [] },
  furnished: null,
  pets_required: null,
  priorities: [],
  dealbreakers: [],
  weights: {},
  summary: null,
}

/** Parse + normalize unknown input into a safe MatchProfile. */
export function normalizeProfile(input: unknown): MatchProfile {
  const parsed = matchProfileSchema.safeParse(input)
  return parsed.success ? parsed.data : structuredClone(EMPTY_PROFILE)
}

/** Whether an alert row's profile column actually holds a v2 profile. */
export function hasProfile(p: unknown): p is MatchProfile {
  return !!p && typeof p === 'object' && (p as { version?: unknown }).version === 2
}

/**
 * The profile the engine should score with: the alert's v2 profile when it has
 * one, else a default-weighted conversion of its legacy v1 criteria.
 */
export function resolveProfile(
  profile: unknown,
  criteria: MatchCriteria,
): MatchProfile {
  return hasProfile(profile) ? normalizeProfile(profile) : profileFromLegacy(criteria)
}

/**
 * Derive a v2 profile from v1 flat criteria (legacy alerts + the backfill).
 * Weights are sensible defaults: what they specified matters, budget and
 * location lead — the renter can sharpen them via feedback or a re-chat.
 */
export function profileFromLegacy(c: MatchCriteria): MatchProfile {
  const p = structuredClone(EMPTY_PROFILE)
  p.budget = { min: c.budget_min, max: c.budget_max, stretch_max: null, stretch_reason: null }
  p.timing = {
    move_in: c.date_start,
    move_out: c.date_end,
    lease_type: c.lease_type,
    duration_months: null,
    flexibility: 'some',
  }
  p.space = {
    whole_unit: c.whole_unit,
    bedrooms_min: c.bedrooms_min,
    bathrooms_min: c.bathrooms_min,
    roommates_ok: c.whole_unit === false ? true : null,
    gender_pref: null,
  }
  p.location = { anchors: [], neighborhoods: [...c.neighborhoods] }
  p.lifestyle = { tags: [], notes: c.roommate_pref ?? c.notes }
  p.amenities = { required: [], preferred: [...c.amenities] }
  p.furnished = c.furnished
  p.pets_required = c.pets_required

  const w: Partial<Record<MatchAttr, number>> = {}
  if (c.budget_max != null || c.budget_min != null) w.budget = 0.9
  if (c.neighborhoods.length > 0) w.location = 0.8
  if (c.date_start != null) w.timing = 0.7
  if (c.bedrooms_min != null || c.whole_unit != null) w.space = 0.6
  if (c.furnished != null) w.furnished = 0.4
  if (c.pets_required === true) w.pets = 0.7
  if (c.amenities.length > 0) w.amenities = 0.5
  p.weights = w

  // Pets and hard budget caps behaved as hard cuts in v1 — preserve that.
  if (c.pets_required === true)
    p.dealbreakers.push({ attr: 'pets', description: 'Must allow pets' })

  p.priorities = (['budget', 'location', 'timing'] as MatchAttr[]).filter(a => w[a] != null).slice(0, 3)
  return p
}

// ── Humanization ────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d') : null
}

export const ATTR_LABELS: Record<MatchAttr, string> = {
  budget: 'Budget',
  location: 'Location',
  timing: 'Timing',
  space: 'Space',
  furnished: 'Furnished',
  pets: 'Pet-friendly',
  amenities: 'Amenities',
}

/** Short summary chips (confirm screen, manage page, email footer). */
export function humanizeProfile(p: MatchProfile): string[] {
  const tags: string[] = []

  if (p.timing.lease_type === 'sublet') tags.push('Sublet')
  else if (p.timing.lease_type === 'full') tags.push('Full lease')

  const start = fmtDate(p.timing.move_in)
  const end = fmtDate(p.timing.move_out)
  if (start && end) tags.push(`${start} – ${end}`)
  else if (start) tags.push(`From ${start}`)

  if (p.budget.max != null) {
    const base =
      p.budget.min != null
        ? `${fmtMoney(p.budget.min)}–${fmtMoney(p.budget.max)}/mo`
        : `Under ${fmtMoney(p.budget.max)}/mo`
    tags.push(p.budget.stretch_max != null ? `${base} (stretch ${fmtMoney(p.budget.stretch_max)})` : base)
  } else if (p.budget.min != null) tags.push(`${fmtMoney(p.budget.min)}+/mo`)

  if (p.space.bedrooms_min != null)
    tags.push(p.space.bedrooms_min === 0 ? 'Studio' : `${p.space.bedrooms_min}+ bed${p.space.bedrooms_min === 1 ? '' : 's'}`)
  if (p.space.whole_unit === false) tags.push('Room in shared unit')

  for (const a of p.location.anchors)
    tags.push(`≤${a.max_minutes} min ${a.mode} to ${a.name}`)
  for (const n of p.location.neighborhoods) tags.push(n)

  if (p.furnished) tags.push('Furnished')
  if (p.pets_required) tags.push('Pet-friendly')
  for (const a of p.amenities.required) tags.push(a)
  for (const a of p.amenities.preferred) tags.push(`${a} (nice-to-have)`)
  for (const t of p.lifestyle.tags) tags.push(t)

  return tags
}
