/**
 * The partner-university email, as pure functions.
 *
 * One template with a handful of placeholders; `renderEmail` fills them for a
 * prospect and refuses to return anything with a placeholder left in it, so a
 * literal "{{university}}" can never reach an inbox.
 */

export const PLACEHOLDERS = ['greeting', 'university', 'partnership', 'country'] as const
export type Placeholder = (typeof PLACEHOLDERS)[number]

export interface TemplateSettings {
  subject: string
  body: string
}

export interface ProspectForEmail {
  name: string
  country: string | null
  umich_units: string[]
  office_name: string | null
  contact_name: string | null
}

export const DEFAULT_SETTINGS = {
  from_name: 'Hugo from Wroomly',
  from_email: 'hugo@wroomly.app',
  // Deliberately blank: nobody should send before choosing where replies go.
  reply_to: '',
  daily_cap: 10,
  subject: 'Housing in Ann Arbor for your students on exchange at Michigan',
  body: `{{greeting}}

I'm Hugo, and I run Wroomly (wroomly.app), a housing marketplace built for University of Michigan students in Ann Arbor. I'm writing because {{partnership}}, and finding a place to live for just one semester is usually the hardest part of an exchange in Ann Arbor: housing here is tight, especially for the fall term, and most leases run 12 months.

Wroomly lists rooms and apartments that current U-M students sublet while they are away, so the dates match an exchange semester instead of a full lease, and the rent is often below the market rate. Many are furnished, renters message the host directly, and hosts can verify themselves with their U-M sign-in. Browsing is free for students.

Would you be open to adding Wroomly to the housing resources you share with students you nominate to Michigan? I can send a short one-page overview to forward, or answer any questions.

If this isn't relevant to your office, just reply and I won't write again.

Thank you for your time,
Hugo
Wroomly, an independent company, not affiliated with the University of Michigan
https://wroomly.app`,
} as const

const UNIT_NAMES: Record<string, string> = {
  Ross: 'the Ross School of Business',
  'Engineering (IPE)': 'the College of Engineering',
  UMSI: 'the School of Information',
  'LSA (CGIS)': 'the College of LSA',
  Law: 'Michigan Law',
  'Medical School': 'the Michigan Medical School',
  Stamps: 'the Stamps School of Art & Design',
}

const unitName = (u: string) => UNIT_NAMES[u] ?? u

const joinList = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/**
 * "X is an exchange partner of the Ross School of Business and …"
 *
 * Says PARTNER, not "sends students": most of what we can evidence is that an
 * agreement exists (a Michigan school's partner list), not which way students
 * travel, and the email must not claim more than that.
 */
export function partnershipSentence(p: Pick<ProspectForEmail, 'name' | 'umich_units'>): string {
  const units = p.umich_units.filter(Boolean).map(unitName)
  return units.length > 0
    ? `${p.name} is an exchange partner of ${joinList(units)}`
    : `${p.name} has an exchange partnership with the University of Michigan`
}

const OFFICE_NOUN = /\b(office|offices|team|unit|service|services|centre|center|department|desk|division|section|secretariat)$/i
const MAX_OFFICE_NAME = 45
const MAX_PERSON_NAME = 40
/** Anything that means "more than one thing, or a description" rather than one name. */
const COMPOUND = /[,;/:–—|&]|\s-\s|\sand\s|\sor\s/i

const stripParens = (t: string) => t.replace(/\s*[(（][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Dear <person>, / Dear <office>, / Hello, — never a made-up name.
 *
 * Names and office titles come from web pages and are often padded or
 * compound ("Student Exchange Office; outgoing", "Anna and Bo",
 * "Takefumi YAMAGUCHI (Outgoing Student Mobility Contact on the fact sheet)").
 * Parentheticals are dropped; anything still compound or long falls back to a
 * plain "Hello," instead of a clumsy salutation. The message is reviewed
 * before sending either way — this just keeps the clumsy ones rare.
 */
export function greeting(p: Pick<ProspectForEmail, 'contact_name' | 'office_name'>): string {
  const person = stripParens(p.contact_name ?? '')
  if (person && person.length <= MAX_PERSON_NAME && !COMPOUND.test(person)) return `Dear ${person},`

  const office = stripParens(p.office_name ?? '')
  if (office && office.length <= MAX_OFFICE_NAME && !COMPOUND.test(office))
    return OFFICE_NOUN.test(office) ? `Dear ${office},` : `Dear ${office} team,`
  return 'Hello,'
}

export function unknownPlaceholders(text: string): string[] {
  const found = [...text.matchAll(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g)].map(m => m[1])
  return [...new Set(found.filter(f => !(PLACEHOLDERS as readonly string[]).includes(f)))]
}

export function fill(template: string, values: Record<Placeholder, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (whole, key: string) =>
    key in values ? values[key as Placeholder] : whole,
  )
}

export interface RenderedEmail {
  subject: string
  body: string
}

export function renderEmail(p: ProspectForEmail, t: TemplateSettings): RenderedEmail {
  const bad = unknownPlaceholders(`${t.subject}\n${t.body}`)
  if (bad.length) throw new Error(`Unknown placeholder${bad.length > 1 ? 's' : ''}: ${bad.map(b => `{{${b}}}`).join(', ')}`)

  const values: Record<Placeholder, string> = {
    greeting: greeting(p),
    university: p.name,
    partnership: partnershipSentence(p),
    country: p.country ?? '',
  }
  return { subject: fill(t.subject, values).trim(), body: fill(t.body, values).trim() }
}
