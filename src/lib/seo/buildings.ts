// SEO: building landing pages at /buildings/[slug] target high-intent
// "sublet at [building]" searches. We deliberately do NOT fabricate
// building-specific facts (addresses, amenities, unit counts) — getting
// those wrong hurts credibility and could imply false affiliation. Each
// page renders an honest, non-fabricated overview + live Wroomly listings
// for that building + a clear "not affiliated" disclaimer.
//
// `note` is an optional hand-verified fact slot. Leave empty until someone
// confirms a real detail; the templated copy stands alone without it.

import { ANN_ARBOR_RESIDENCES } from '@/lib/constants'

export interface BuildingContent {
  slug: string
  name: string // must match listings.residence_name exactly
  note?: string // optional verified fact, safe to leave undefined
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Derive the building list from the same constant the listing form uses,
// so a building added to the picker automatically gets a landing page.
export const BUILDINGS: BuildingContent[] = ANN_ARBOR_RESIDENCES.map(name => ({
  slug: slugify(name),
  name,
}))

export function getBuilding(slug: string): BuildingContent | undefined {
  return BUILDINGS.find(b => b.slug === slug)
}

/**
 * Honest, non-fabricated overview paragraphs for a building page. Uses
 * only the name — no invented addresses or amenities. Distinct enough
 * per building (name woven through) to avoid pure-duplicate content,
 * while the live listings below add the real unique substance.
 */
export function buildingIntro(name: string): string[] {
  return [
    `${name} is one of the named student apartment communities University of Michigan students search for when they're looking to sublet near campus in Ann Arbor. If someone's leaving ${name} for the summer, a semester abroad, or an internship, this is where their sublet shows up on Wroomly.`,
    `Every listing below is posted by a verified @umich.edu student — so you're not wiring a deposit to a stranger off a Facebook group. If there are no live listings at ${name} right now, save a search and we'll email you the moment one posts.`,
  ]
}
