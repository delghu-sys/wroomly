import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { generateManageToken } from '@/lib/match/token'
import { normalizeCriteria } from '@/lib/match/criteria'
import type { MatchAlert, MatchCriteria, MatchFrequency } from '@/types/database'

/**
 * Service-layer helpers for match_alerts. All access uses the service-role
 * client (the table is RLS-locked with no policies) and is gated by the
 * manage_token, never a session — alerts are anonymous.
 */

// Re-export for callers; transcript rows share the chat turn shape.
type Transcript = MatchAlert['transcript']

export interface CreateAlertInput {
  email: string
  criteria: MatchCriteria
  transcript: Transcript
  frequency?: MatchFrequency
  source?: string
  userId?: string | null
}

/**
 * Create a new alert, or update the existing one for this email (one active
 * alert per address). Re-running the chat with the same email overwrites the
 * old criteria and re-activates it. Returns the row + whether it was new.
 */
export async function createOrUpdateAlert(
  input: CreateAlertInput,
): Promise<{ alert: MatchAlert; isNew: boolean }> {
  const service = createServiceClient()
  const email = input.email.trim()
  const criteria = normalizeCriteria(input.criteria)
  const now = new Date().toISOString()

  const { data: existing } = await service
    .from('match_alerts')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    const { data: updated } = await service
      .from('match_alerts')
      .update({
        criteria,
        transcript: input.transcript,
        status: 'active',
        // Honor a re-stated frequency, else keep theirs.
        ...(input.frequency ? { frequency: input.frequency } : {}),
        confirmed_at: (existing as MatchAlert).confirmed_at ?? now,
      })
      .eq('id', (existing as MatchAlert).id)
      .select('*')
      .single()
    return { alert: updated as MatchAlert, isNew: false }
  }

  const { data: created, error } = await service
    .from('match_alerts')
    .insert({
      email,
      criteria,
      transcript: input.transcript,
      status: 'active',
      frequency: input.frequency ?? 'instant',
      manage_token: generateManageToken(),
      // Single opt-in: the renter typed their own address, so consent is now.
      confirmed_at: now,
      user_id: input.userId ?? null,
      source: input.source ?? 'match_page',
      last_matched_at: now,
    })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create match alert: ${error?.message}`)
  }
  return { alert: created as MatchAlert, isNew: true }
}

export async function getAlertByToken(
  token: string,
): Promise<MatchAlert | null> {
  if (!token) return null
  const service = createServiceClient()
  const { data } = await service
    .from('match_alerts')
    .select('*')
    .eq('manage_token', token)
    .maybeSingle()
  return (data as MatchAlert | null) ?? null
}

export async function updateAlertByToken(
  token: string,
  patch: Partial<Pick<MatchAlert, 'criteria' | 'frequency' | 'status'>>,
): Promise<MatchAlert | null> {
  const service = createServiceClient()
  const clean: Record<string, unknown> = {}
  if (patch.criteria !== undefined) clean.criteria = normalizeCriteria(patch.criteria)
  if (patch.frequency !== undefined) clean.frequency = patch.frequency
  if (patch.status !== undefined) clean.status = patch.status

  const { data } = await service
    .from('match_alerts')
    .update(clean)
    .eq('manage_token', token)
    .select('*')
    .maybeSingle()
  return (data as MatchAlert | null) ?? null
}

/** One-click unsubscribe. Idempotent — flips status to 'unsubscribed'. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false
  const service = createServiceClient()
  const { data } = await service
    .from('match_alerts')
    .update({ status: 'unsubscribed' })
    .eq('manage_token', token)
    .select('id')
    .maybeSingle()
  return !!data
}

/**
 * Opt-in doubles as joining the launch list. Best-effort upsert into
 * renter_waitlist (unique on lower(email)); never throws into the caller.
 */
export async function addToWaitlist(email: string, source: string): Promise<void> {
  try {
    const service = createServiceClient()
    await service
      .from('renter_waitlist')
      .upsert({ email: email.trim(), source }, { onConflict: 'email', ignoreDuplicates: true })
  } catch (err) {
    console.error('[match] waitlist upsert failed (non-fatal)', err)
  }
}
