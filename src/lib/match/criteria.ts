import { z } from 'zod'
import { format, parseISO, isValid } from 'date-fns'
import { AMENITIES, ANN_ARBOR_NEIGHBORHOODS } from '@/lib/constants'
import type { MatchCriteria } from '@/types/database'

/**
 * Wroomly Match — criteria shape, validation, and humanization.
 *
 * The criteria object is produced by the LLM at the end of the chat, edited on
 * the manage page, and consumed by the matching engine. Field names mirror the
 * `listings` columns so scoring is a direct comparison; prices are whole dollars
 * (cents conversion happens only at query time).
 */

const NEIGHBORHOODS = new Set<string>(ANN_ARBOR_NEIGHBORHOODS)
const AMENITY_SET = new Set<string>(AMENITIES)

/**
 * Zod schema for a criteria object. Used to validate both the LLM extraction
 * (which can hallucinate) and manage-page edits. `.catch`/`.default` keep it
 * forgiving — a malformed field degrades to "no preference" rather than 400ing
 * the whole save.
 */
export const matchCriteriaSchema: z.ZodType<MatchCriteria> = z.object({
  budget_min: z.number().int().positive().max(100000).nullable().catch(null),
  budget_max: z.number().int().positive().max(100000).nullable().catch(null),
  bedrooms_min: z.number().int().min(0).max(10).nullable().catch(null),
  whole_unit: z.boolean().nullable().catch(null),
  bathrooms_min: z.number().min(0).max(10).nullable().catch(null),
  lease_type: z.enum(['sublet', 'full', 'either']).nullable().catch(null),
  date_start: z.string().nullable().catch(null),
  date_end: z.string().nullable().catch(null),
  // Keep only neighborhoods we actually recognize — anything else can't match a
  // listing column anyway, and dropping it avoids dead filters.
  neighborhoods: z
    .array(z.string())
    .catch([])
    .transform(arr => arr.filter(n => NEIGHBORHOODS.has(n))),
  furnished: z.boolean().nullable().catch(null),
  amenities: z
    .array(z.string())
    .catch([])
    .transform(arr => arr.filter(a => AMENITY_SET.has(a))),
  pets_required: z.boolean().nullable().catch(null),
  roommate_pref: z.string().max(200).nullable().catch(null),
  notes: z.string().max(500).nullable().catch(null),
})

export const EMPTY_CRITERIA: MatchCriteria = {
  budget_min: null,
  budget_max: null,
  bedrooms_min: null,
  whole_unit: null,
  bathrooms_min: null,
  lease_type: null,
  date_start: null,
  date_end: null,
  neighborhoods: [],
  furnished: null,
  amenities: [],
  pets_required: null,
  roommate_pref: null,
  notes: null,
}

/** Parse + normalize unknown input into a safe MatchCriteria. */
export function normalizeCriteria(input: unknown): MatchCriteria {
  const parsed = matchCriteriaSchema.safeParse(input)
  return parsed.success ? parsed.data : { ...EMPTY_CRITERIA }
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d') : null
}

/**
 * Human-readable summary tags for the confirm screen, the "done" recap, and the
 * manage page. Returns short chips like the design ("June – July",
 * "$800–$1,000/mo", "Furnished", "1 bed").
 */
export function humanizeCriteria(c: MatchCriteria): string[] {
  const tags: string[] = []

  // Lease type
  if (c.lease_type === 'sublet') tags.push('Sublet')
  else if (c.lease_type === 'full') tags.push('Full lease')

  // Dates
  const start = fmtDate(c.date_start)
  const end = fmtDate(c.date_end)
  if (start && end) tags.push(`${start} – ${end}`)
  else if (start) tags.push(`From ${start}`)

  // Budget
  if (c.budget_min != null && c.budget_max != null)
    tags.push(`${fmtMoney(c.budget_min)}–${fmtMoney(c.budget_max)}/mo`)
  else if (c.budget_max != null) tags.push(`Under ${fmtMoney(c.budget_max)}/mo`)
  else if (c.budget_min != null) tags.push(`${fmtMoney(c.budget_min)}+/mo`)

  // Bedrooms
  if (c.bedrooms_min != null) {
    if (c.bedrooms_min === 0) tags.push('Studio')
    else tags.push(`${c.bedrooms_min}+ bed${c.bedrooms_min === 1 ? '' : 's'}`)
  }
  if (c.whole_unit === false) tags.push('Room in shared unit')

  if (c.bathrooms_min != null && c.bathrooms_min > 0)
    tags.push(`${c.bathrooms_min}+ bath`)

  // Location
  for (const n of c.neighborhoods) tags.push(n)

  // Flags
  if (c.furnished) tags.push('Furnished')
  if (c.pets_required) tags.push('Pet-friendly')
  for (const a of c.amenities) tags.push(a)

  return tags
}

/** Whether we have enough signal to bother matching at all. */
export function criteriaIsMeaningful(c: MatchCriteria): boolean {
  return (
    c.budget_max != null ||
    c.budget_min != null ||
    c.bedrooms_min != null ||
    c.date_start != null ||
    c.neighborhoods.length > 0 ||
    c.amenities.length > 0 ||
    c.lease_type != null ||
    c.furnished != null
  )
}
