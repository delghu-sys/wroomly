import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * DB-backed sliding-window rate limiter for the PUBLIC, ANONYMOUS Wroomly Match
 * endpoints (chat / criteria / alerts). These have no session to key off, so
 * they'd otherwise let anyone run up an unbounded Anthropic bill or email-bomb a
 * victim. This is the same circuit-breaker idea the AI Listing Importer uses —
 * count recent hits, refuse once over the cap — backed by match_rate_events
 * (migration 028) because chat/criteria write no domain rows to count against.
 *
 * Fail-OPEN: if the ledger is unreachable (or the migration hasn't been applied
 * yet), we log and allow rather than 500 the feature. A limiter outage must
 * never be more disruptive than the abuse it guards against — this matches
 * sendEmail's "never break the calling flow" stance and the importer's
 * count-error-means-allow behavior.
 */

export type RateScope = 'global' | 'identifier'

export interface RateRule {
  scope: RateScope
  max: number
  windowMs: number
}

export interface RateEvent {
  /** Endpoint bucket: 'chat' | 'criteria' | 'alerts'. */
  bucket: string
  /** Per-subject key for 'identifier'-scoped rules (e.g. target email). */
  identifier?: string | null
}

const HOUR = 60 * 60 * 1000

// Generous global circuit-breakers — sized well above expected launch volume,
// present only to bound worst-case cost/abuse, not to police normal use. A full
// interview is ~8–12 chat turns, then one criteria extraction, then one alert.
// No per-IP cap on the LLM buckets: UMich students share the campus NAT, so an
// IP limit would lock out everyone on campus wifi at once (same call the AI
// Listing Importer made).
export const CHAT_LIMITS: RateRule[] = [{ scope: 'global', max: 400, windowMs: HOUR }]
export const CRITERIA_LIMITS: RateRule[] = [{ scope: 'global', max: 150, windowMs: HOUR }]
// alerts also sends an email to a caller-supplied address — the per-identifier
// (target email) cap stops one address being bombed; the global cap bounds
// total send volume (and Anthropic-free but DB) cost.
export const ALERT_LIMITS: RateRule[] = [
  { scope: 'identifier', max: 3, windowMs: HOUR },
  { scope: 'global', max: 150, windowMs: HOUR },
]

/**
 * Returns true if the request is allowed. Evaluates every rule against the
 * sliding window; the first breach denies. On allow, records exactly one event
 * (carrying the identifier) so both global and per-identifier windows advance
 * from a single row.
 */
export async function allowMatchRequest(
  event: RateEvent,
  rules: RateRule[],
): Promise<boolean> {
  try {
    const service = createServiceClient()

    for (const rule of rules) {
      if (rule.scope === 'identifier' && !event.identifier) continue
      const since = new Date(Date.now() - rule.windowMs).toISOString()
      let query = service
        .from('match_rate_events')
        .select('id', { count: 'exact', head: true })
        .eq('bucket', event.bucket)
        .gte('created_at', since)
      if (rule.scope === 'identifier') {
        query = query.eq('identifier', event.identifier as string)
      }
      const { count, error } = await query
      if (error) {
        // Ledger unreachable / table missing → fail open (see file header).
        console.error('[match/rate-limit] count failed, allowing', {
          bucket: event.bucket,
          scope: rule.scope,
          error: error.message,
        })
        return true
      }
      if ((count ?? 0) >= rule.max) return false
    }

    await service
      .from('match_rate_events')
      .insert({ bucket: event.bucket, identifier: event.identifier ?? null })

    return true
  } catch (err) {
    console.error('[match/rate-limit] threw, allowing', err)
    return true
  }
}
