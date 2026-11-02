/**
 * The partner-university email, as pure functions.
 *
 * One template with a handful of placeholders; `renderEmail` fills them for a
 * prospect and refuses to return anything with a placeholder left in it, so a
 * literal "{{university}}" can never reach an inbox.
 */

/** The one-page overview for exchange offices (src/app/(app)/exchange). The link our emails point to. */
export const OVERVIEW_URL = 'https://wroomly.app/exchange'

export const PLACEHOLDERS = ['greeting', 'university', 'partnership', 'country', 'origin_line'] as const
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
  from_email: 'hugodelgado@wroomly.app',
  reply_to: 'delghu@umich.edu',
  daily_cap: 100,
  subject: 'Housing in Ann Arbor for your students on exchange at Michigan',
  body: `{{greeting}}

I'm Hugo, and I run Wroomly (wroomly.app), a housing marketplace built for University of Michigan students in Ann Arbor. {{origin_line}} I'm writing because {{partnership}}, and finding a place to live for just one semester is usually the hardest part of an exchange in Ann Arbor: housing here is tight, especially for the fall term, and most leases run 12 months.

Wroomly lists rooms and apartments that current U-M students sublet while they are away, so the dates match an exchange semester instead of a full lease, and the rent is often below the market rate. Many are furnished, renters message the host directly, and hosts can verify themselves with their U-M sign-in. Browsing is free for students.

Would you be open to adding Wroomly to the housing resources you share with students you nominate to Michigan? There is a one-page overview you can forward or print here: ${OVERVIEW_URL}. I'm also happy to answer any questions.

If this isn't relevant to your office, just reply and I won't write again.

Thank you for your time,
Hugo
Wroomly, an independent company, not affiliated with the University of Michigan
https://wroomly.app`,
} as const

/**
 * French universities are written to in French, with their own wording.
 * It lives in code rather than in the editable settings: there is one, and
 * every individual message can still be edited on its own page before it is
 * approved. First person is kept gender-neutral on purpose ("originaire de
 * France", not "français/française").
 */
export const FRENCH_TEMPLATE: TemplateSettings = {
  subject: 'Logement à Ann Arbor pour vos étudiants en échange à Michigan',
  body: `{{greeting}}

Je m'appelle Hugo, je suis originaire de France et je dirige Wroomly (wroomly.app), une plateforme de logement conçue pour les étudiants de l'Université du Michigan à Ann Arbor. Je vous écris parce que {{partnership}}, et trouver un logement pour un seul semestre est souvent le plus difficile lors d'un échange à Ann Arbor : l'offre y est limitée, surtout au semestre d'automne, et la plupart des baux durent 12 mois.

Wroomly propose des chambres et des appartements que des étudiants actuels de Michigan sous-louent pendant leur absence : les dates correspondent donc à un semestre d'échange plutôt qu'à un bail annuel, et le loyer est souvent inférieur à celui du marché. Beaucoup de logements sont meublés, les locataires écrivent directement à l'hôte, et les hôtes peuvent se faire vérifier avec leur compte U-M. La consultation est gratuite pour les étudiants.

Accepteriez-vous d'ajouter Wroomly aux ressources logement que vous transmettez aux étudiants que vous nommez pour Michigan ? Une présentation d'une page, à transmettre ou à imprimer, est disponible ici : ${OVERVIEW_URL}. Je reste également à votre disposition pour toute question.

Si ce message ne concerne pas votre service, répondez simplement et je ne vous écrirai plus.

Je vous remercie de votre attention.

Cordialement,
Hugo
Wroomly, entreprise indépendante, non affiliée à l'Université du Michigan
https://wroomly.app`,
}

export type Language = 'en' | 'fr'
export const languageFor = (country: string | null): Language => (country?.trim().toLowerCase() === 'france' ? 'fr' : 'en')

/** Countries where "I'm from France myself" is a natural line. Not a claim of
 *  being European — just where being French is a shared, nearby background. */
const EUROPE = new Set([
  'albania', 'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic', 'czechia', 'denmark', 'estonia',
  'finland', 'germany', 'greece', 'hungary', 'iceland', 'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg',
  'malta', 'netherlands', 'norway', 'poland', 'portugal', 'romania', 'serbia', 'slovakia', 'slovenia', 'spain',
  'sweden', 'switzerland', 'united kingdom', 'uk',
])

/**
 * The personal line. French offices get it as part of the French template
 * ("originaire de France"); other European offices get one honest English
 * sentence; everyone else gets nothing — the line is only worth it where
 * the shared background actually registers.
 */
export function originLine(country: string | null): string {
  const c = country?.trim().toLowerCase() ?? ''
  if (c !== 'france' && EUROPE.has(c))
    return "I'm from France myself, so I know how stressful it is to find a place abroad for a semester."
  return ''
}

const UNIT_NAMES_FR: Record<string, string> = {
  Ross: 'la Ross School of Business',
  'Engineering (IPE)': "l'école d'ingénieurs (College of Engineering)",
  UMSI: 'la School of Information',
  'LSA (CGIS)': 'le College of LSA',
  Law: 'la Michigan Law School',
  'Medical School': 'la faculté de médecine de Michigan',
  Stamps: 'la Stamps School of Art & Design',
}

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
/** "X est partenaire d'échange de la Ross School of Business et de …" */
export function partnershipSentenceFr(p: Pick<ProspectForEmail, 'name' | 'umich_units'>): string {
  const units = p.umich_units.filter(Boolean).map(u => UNIT_NAMES_FR[u] ?? u)
  if (units.length === 0) return `${p.name} a un partenariat d'échange avec l'Université du Michigan`
  const withDe = units.map(u => (/^(la|le) /.test(u) ? u.replace(/^le /, 'du ').replace(/^la /, 'de la ') : `de ${u}`))
  const list = withDe.length === 1 ? withDe[0] : `${withDe.slice(0, -1).join(', ')} et ${withDe[withDe.length - 1]}`
  return `${p.name} est partenaire d'échange ${list}`
}

/** French: "Madame, Monsieur," for an office, "Bonjour <name>," for a named person. */
export function greetingFr(p: Pick<ProspectForEmail, 'contact_name' | 'office_name'>): string {
  const person = stripParens(p.contact_name ?? '')
  if (person && person.length <= MAX_PERSON_NAME && !COMPOUND.test(person)) return `Bonjour ${person},`
  return 'Madame, Monsieur,'
}

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
  return template
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (whole, key: string) => (key in values ? values[key as Placeholder] : whole))
    // An empty placeholder (the origin line, for most countries) leaves two
    // spaces behind; collapse runs of spaces/tabs, never newlines.
    .replace(/[ \t]{2,}/g, ' ')
}

export interface RenderedEmail {
  subject: string
  body: string
}

export function renderEmail(p: ProspectForEmail, t: TemplateSettings): RenderedEmail {
  const lang = languageFor(p.country)
  // French offices get the French template; everyone else the editable one.
  const tpl = lang === 'fr' ? FRENCH_TEMPLATE : t
  const bad = unknownPlaceholders(`${tpl.subject}\n${tpl.body}`)
  if (bad.length) throw new Error(`Unknown placeholder${bad.length > 1 ? 's' : ''}: ${bad.map(b => `{{${b}}}`).join(', ')}`)

  const values: Record<Placeholder, string> = {
    greeting: lang === 'fr' ? greetingFr(p) : greeting(p),
    university: p.name,
    partnership: lang === 'fr' ? partnershipSentenceFr(p) : partnershipSentence(p),
    country: p.country ?? '',
    origin_line: lang === 'fr' ? '' : originLine(p.country),
  }
  return { subject: fill(tpl.subject, values).trim(), body: fill(tpl.body, values).trim() }
}
