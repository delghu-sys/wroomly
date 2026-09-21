/**
 * The contract every discovery source implements.
 *
 * A source is only eligible if posting on it is itself an invitation to be
 * contacted — a university housing board, a building's own resident-sublet page.
 * That is the line we drew: we do not harvest people who did not ask to hear
 * from anyone. An adapter must also never return image data; we link to the
 * post rather than copying its photos, so nothing is republished.
 */

import { termHasEnded } from './prefill.ts'

export interface RawLead {
  /** Stable id WITHIN this source. With `key` it forms the dedupe key, so
   *  re-running discovery can never duplicate a lead or a message. */
  sourceExternalId: string
  sourceUrl?: string
  title?: string
  /** Only set when the poster published it themselves, inviting contact. */
  contactEmail?: string
  /** Facts the adapter parsed: price, dates, beds, neighborhood… */
  extracted?: Record<string, unknown>
}

export interface FetchContext {
  /**
   * `sourceExternalId`s we already hold for this source. An adapter that can
   * cheaply tell which posts are new (e.g. from a sitemap) SHOULD skip the
   * known ones rather than re-fetching them — that is the difference between
   * hitting someone's site once per run and hitting it a hundred times.
   */
  knownIds?: Set<string>
  /** Upper bound on network requests for one run. Adapters must respect it. */
  maxFetches?: number
}

export interface SourceAdapter {
  /** Stable, lowercase; stored on every lead. Changing it orphans dedupe. */
  key: string
  label: string
  /** Why contacting people from this source is legitimate. Shown in the admin
   *  queue so the justification travels with the data. */
  contactBasis: string
  fetchLeads(ctx?: FetchContext): Promise<RawLead[]>
}

/** Drop leads an adapter shouldn't have returned, so one bad adapter can't
 *  poison the pipeline. Returns the survivors plus what was rejected. */
export function sanitizeLeads(
  leads: RawLead[],
  { now = new Date() }: { now?: Date } = {},
): {
  ok: RawLead[]
  rejected: { lead: RawLead; reason: string }[]
} {
  const ok: RawLead[] = []
  const rejected: { lead: RawLead; reason: string }[] = []
  const seen = new Set<string>()

  for (const l of leads) {
    if (!l.sourceExternalId?.trim()) { rejected.push({ lead: l, reason: 'missing sourceExternalId' }); continue }
    if (seen.has(l.sourceExternalId)) { rejected.push({ lead: l, reason: 'duplicate sourceExternalId' }); continue }
    if (l.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(l.contactEmail)) {
      rejected.push({ lead: l, reason: 'malformed contactEmail' }); continue
    }
    // Expired posts never enter the queue. Contacting someone about a sublet
    // they filled months ago is useless to them and the quickest route to a
    // spam complaint. Only a term we can PROVE is over is dropped — an
    // undateable post is kept, since a parsing gap is not evidence of
    // staleness (see termHasEnded).
    const dates = typeof l.extracted?.dates === 'string' ? l.extracted.dates : null
    const postedAt = typeof l.extracted?.postedAt === 'string' ? l.extracted.postedAt : null
    if (termHasEnded(dates, now, postedAt)) {
      rejected.push({ lead: l, reason: `term already ended ("${dates}")` })
      continue
    }
    seen.add(l.sourceExternalId)
    ok.push(l)
  }
  return { ok, rejected }
}
