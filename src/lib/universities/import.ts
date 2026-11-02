/**
 * Turns the researchers' JSON into rows, and refuses what should not be a
 * contact: an address with no source page, or a private mailbox.
 */

export interface RawProspect {
  name?: unknown
  country?: unknown
  city?: unknown
  website?: unknown
  umichUnits?: unknown
  evidenceUrl?: unknown
  office?: {
    name?: unknown
    email?: unknown
    emailSourceUrl?: unknown
    emailKind?: unknown
    contactName?: unknown
    contactTitle?: unknown
    phone?: unknown
    contactFormUrl?: unknown
    pageUrl?: unknown
  } | null
  confidence?: unknown
  notes?: unknown
}

export interface ProspectInsert {
  slug: string
  name: string
  country: string | null
  city: string | null
  website: string | null
  umich_units: string[]
  evidence_url: string | null
  office_name: string | null
  office_page_url: string | null
  contact_email: string | null
  contact_email_source_url: string | null
  contact_kind: 'office' | 'named' | null
  contact_name: string | null
  contact_form_url: string | null
  phone: string | null
  confidence: 'verified' | 'likely' | 'not_found'
  notes: string | null
}

const PRIVATE_MAILBOX = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|aol|proton|protonmail|qq|163|126)\./i
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const url = (v: unknown): string | null => {
  const t = text(v)
  if (!t) return null
  try {
    return new URL(t).protocol.startsWith('http') ? t : null
  } catch {
    return null
  }
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeProspect(raw: RawProspect): { ok: ProspectInsert; dropped: string[] } | { error: string } {
  const name = text(raw.name)
  if (!name) return { error: 'missing name' }

  const dropped: string[] = []
  const o = raw.office ?? {}
  let email = text(o.email)?.toLowerCase() ?? null
  let sourceUrl = url(o.emailSourceUrl)
  let confidence: ProspectInsert['confidence'] =
    raw.confidence === 'verified' || raw.confidence === 'likely' ? raw.confidence : 'not_found'

  if (email && !EMAIL_RE.test(email)) {
    dropped.push(`"${email}" is not an email address`)
    email = null
  }
  if (email && PRIVATE_MAILBOX.test(email)) {
    dropped.push(`${email} is a private mailbox, not an institutional address`)
    email = null
  }
  // An address nobody can trace back to a page is a guess, however plausible.
  if (email && !sourceUrl) {
    dropped.push(`${email} has no source page`)
    email = null
  }
  if (!email) {
    sourceUrl = null
    confidence = 'not_found'
  }

  const kind = o.emailKind === 'named' ? 'named' : o.emailKind === 'office' ? 'office' : null
  const units = Array.isArray(raw.umichUnits) ? raw.umichUnits.map(text).filter((u): u is string => !!u) : []

  return {
    ok: {
      slug: slugify(name),
      name,
      country: text(raw.country),
      city: text(raw.city),
      website: url(raw.website),
      umich_units: units,
      evidence_url: url(raw.evidenceUrl),
      office_name: text(o.name),
      office_page_url: url(o.pageUrl),
      contact_email: email,
      contact_email_source_url: sourceUrl,
      contact_kind: email ? kind : null,
      contact_name: text(o.contactName),
      contact_form_url: url(o.contactFormUrl),
      phone: text(o.phone),
      confidence,
      notes: text(raw.notes),
    },
    dropped,
  }
}

/** Merge entries that describe the same university: keep the better contact,
 *  union the Michigan units. */
export function mergeProspects(rows: ProspectInsert[]): ProspectInsert[] {
  const rank = { verified: 2, likely: 1, not_found: 0 }
  const bySlug = new Map<string, ProspectInsert>()
  for (const r of rows) {
    const have = bySlug.get(r.slug)
    if (!have) {
      bySlug.set(r.slug, { ...r })
      continue
    }
    const best = rank[r.confidence] > rank[have.confidence] ? r : have
    bySlug.set(r.slug, {
      ...best,
      umich_units: [...new Set([...have.umich_units, ...r.umich_units])],
      evidence_url: have.evidence_url ?? r.evidence_url,
      notes: [have.notes, r.notes].filter(Boolean).filter((n, i, a) => a.indexOf(n) === i).join(' · ') || null,
    })
  }
  return [...bySlug.values()]
}
