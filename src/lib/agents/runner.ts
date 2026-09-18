import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeLeads, type SourceAdapter } from './source-adapter.ts'
import { planOutreach, type OutreachCandidate, type SkipReason } from './outreach-policy.ts'
import { unsubscribeUrl } from './unsubscribe-token.ts'
import {
  generateClaimToken,
  hashClaimToken,
  claimTokenExpiry,
} from '../listing-import/claim-token.ts'
import { cmbResidentSublets } from './sources/cmb-resident-sublets.ts'

/**
 * The three agents as plain functions, so ONE implementation serves both the
 * admin console (/admin/agents → /api/admin/agents) and the terminal
 * (scripts/agents/*.mjs). Each caller hands in its own Supabase client and,
 * for outreach, its own email sender; nothing here reads a request or a
 * session, and there is deliberately no `server-only` import, because the CLI
 * runs under raw Node.
 *
 * Every function is a dry run unless `execute` is true. Outreach additionally
 * refuses to send unless OUTREACH_ENABLED=true in the environment — that
 * second, independent switch lives HERE so the console and the CLI cannot
 * disagree about it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, 'public', any>

export const SOURCES: SourceAdapter[] = [cmbResidentSublets]

// ── discover ────────────────────────────────────────────────────────────────

export interface DiscoverSourceResult {
  key: string
  label: string
  contactBasis: string
  found: number
  withContact: number
  /** Rows actually inserted (duplicates from earlier runs are ignored). */
  inserted: number
  rejected: string[]
  error?: string
}

export interface DiscoverResult {
  execute: boolean
  sources: DiscoverSourceResult[]
}

export async function runDiscover(
  db: Db,
  { sourceKeys, execute }: { sourceKeys: string[]; execute: boolean },
): Promise<DiscoverResult> {
  const results: DiscoverSourceResult[] = []

  for (const adapter of SOURCES.filter(a => sourceKeys.includes(a.key))) {
    const r: DiscoverSourceResult = {
      key: adapter.key,
      label: adapter.label,
      contactBasis: adapter.contactBasis,
      found: 0,
      withContact: 0,
      inserted: 0,
      rejected: [],
    }
    results.push(r)

    let raw
    try {
      raw = await adapter.fetchLeads()
    } catch (err) {
      r.error = err instanceof Error ? err.message : String(err)
      continue
    }

    const { ok, rejected } = sanitizeLeads(raw)
    r.found = ok.length
    r.withContact = ok.filter(l => l.contactEmail).length
    r.rejected = rejected.map(x => x.reason)
    if (!execute) continue

    for (const l of ok) {
      // upsert + ignoreDuplicates: re-running never disturbs an existing lead,
      // so a lead already contacted or opted out cannot be reset by discovery.
      const { data, error } = await db
        .from('sourced_leads')
        .upsert(
          {
            source: adapter.key,
            source_external_id: l.sourceExternalId,
            source_url: l.sourceUrl ?? null,
            title: l.title ?? null,
            contact_email: l.contactEmail ?? null,
            extracted: l.extracted ?? {},
          },
          { onConflict: 'source,source_external_id', ignoreDuplicates: true },
        )
        .select('id')
      if (error) {
        r.error = error.message
        break
      }
      r.inserted += data?.length ?? 0
    }
  }

  return { execute, sources: results }
}

// ── draft ───────────────────────────────────────────────────────────────────

export interface DraftResult {
  execute: boolean
  candidates: number
  drafted: number
  skippedSuppressed: number
  errors: string[]
}

interface LeadForDraft {
  id: string
  source: string
  source_url: string | null
  title: string | null
  contact_email: string
  extracted: Record<string, unknown>
}

export async function runDraft(
  db: Db,
  { execute, limit = 25 }: { execute: boolean; limit?: number },
): Promise<DraftResult> {
  const out: DraftResult = { execute, candidates: 0, drafted: 0, skippedSuppressed: 0, errors: [] }

  // Only leads WITH a contact get drafted: a draft exists so we have something
  // to offer the person, and there is no point preparing one we cannot mention.
  const [{ data: leads, error }, { data: sups }] = await Promise.all([
    db
      .from('sourced_leads')
      .select('id, source, source_url, title, contact_email, extracted')
      .eq('status', 'new')
      .not('contact_email', 'is', null)
      .limit(limit),
    db.from('outreach_suppressions').select('email'),
  ])
  if (error) {
    out.errors.push(error.message)
    return out
  }
  const suppressed = new Set((sups ?? []).map((s: { email: string }) => s.email.toLowerCase()))
  const rows = (leads ?? []) as LeadForDraft[]
  out.candidates = rows.length

  for (const lead of rows) {
    // An opted-out address must never get a draft prepared for it either.
    if (suppressed.has(lead.contact_email.toLowerCase())) {
      out.skippedSuppressed += 1
      if (execute) {
        await db
          .from('sourced_leads')
          .update({ status: 'skipped', skip_reason: 'suppressed' })
          .eq('id', lead.id)
      }
      continue
    }
    if (!execute) {
      out.drafted += 1
      continue
    }

    const token = generateClaimToken()
    const { data: req, error: reqErr } = await db
      .from('listing_import_requests')
      .insert({
        email: lead.contact_email,
        personal_source_url: lead.source_url,
        // Facts only. `consent_confirmed` stays FALSE: the resident has not
        // agreed to anything yet — claiming the draft is that consent.
        consent_confirmed: false,
        status: 'pending',
        extracted_data: { ...lead.extracted, sourcedFrom: lead.source, title: lead.title },
        claim_token_hash: hashClaimToken(token),
        claim_token_expires_at: claimTokenExpiry().toISOString(),
      })
      .select('id')
      .single()
    if (reqErr) {
      out.errors.push(`draft failed for lead ${lead.id}: ${reqErr.message}`)
      continue
    }

    // The raw token is stored on the lead ONLY until outreach sends it, because
    // the email is the only place it is ever revealed. runOutreach clears it.
    const { error: upErr } = await db
      .from('sourced_leads')
      .update({
        status: 'drafted',
        import_request_id: req.id,
        extracted: { ...lead.extracted, _claimToken: token },
      })
      .eq('id', lead.id)
    if (upErr) {
      out.errors.push(`lead update failed for ${lead.id}: ${upErr.message}`)
      continue
    }
    out.drafted += 1
  }

  return out
}

// ── outreach ────────────────────────────────────────────────────────────────

export type SendEmail = (msg: {
  to: string
  subject: string
  text: string
  listUnsubscribe: string
}) => Promise<void>

export interface OutreachResult {
  execute: boolean
  /** False when execute was requested but OUTREACH_ENABLED is not 'true'. */
  enabled: boolean
  dailyCap: number
  sentInLastDay: number
  planned: number
  sent: number
  skipped: Partial<Record<SkipReason, number>>
  errors: string[]
}

// CAN-SPAM requires a real postal address in every commercial message.
const POSTAL = 'Wroomly LLC, 1912 Geddes Ave, Ann Arbor, MI 48104'

export function outreachBody({
  title,
  claimUrl,
  unsubUrl,
}: {
  title: string
  claimUrl: string
  unsubUrl: string
}): string {
  // Plain, honest, and short. It says where we saw them, what we made, that it
  // is not public, and how to make it stop — in the first screenful.
  return `Hi,

We saw your sublet post ("${title}") on the Ann Arbor sublet board.

Wroomly is a free sublet marketplace for the U-M community. We've pre-filled a
listing draft from your post so you don't have to retype it. It is NOT public —
nobody can see it unless you claim it and publish it yourself:

${claimUrl}

The link works for 7 days. If you're not interested, ignore this and nothing
happens: the draft expires unpublished and we won't email you again.

Never want to hear from us? ${unsubUrl}

${POSTAL}`
}

type LeadForOutreach = OutreachCandidate & {
  title: string | null
  extracted: Record<string, unknown>
}

export async function runOutreach(
  db: Db,
  {
    execute,
    send,
    origin = 'https://wroomly.app',
    dailyCap = Number(process.env.OUTREACH_DAILY_CAP ?? 25),
  }: { execute: boolean; send: SendEmail; origin?: string; dailyCap?: number },
): Promise<OutreachResult> {
  const enabled = process.env.OUTREACH_ENABLED === 'true'
  const out: OutreachResult = {
    execute,
    enabled,
    dailyCap,
    sentInLastDay: 0,
    planned: 0,
    sent: 0,
    skipped: {},
    errors: [],
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ data: candidates, error }, { data: sups }, { count }] = await Promise.all([
    db
      .from('sourced_leads')
      .select('id, contact_email, status, import_request_id, outreach_sent_at, title, extracted')
      .eq('status', 'drafted')
      .is('outreach_sent_at', null)
      .limit(200),
    db.from('outreach_suppressions').select('email'),
    db
      .from('sourced_leads')
      .select('id', { count: 'exact', head: true })
      .gte('outreach_sent_at', since),
  ])
  if (error) {
    out.errors.push(error.message)
    return out
  }
  out.sentInLastDay = count ?? 0

  const plan = planOutreach({
    candidates: (candidates ?? []) as LeadForOutreach[],
    suppressed: (sups ?? []).map((s: { email: string }) => s.email),
    sentInLastDay: out.sentInLastDay,
    dailyCap,
  })
  out.planned = plan.send.length
  for (const s of plan.skipped) out.skipped[s.reason] = (out.skipped[s.reason] ?? 0) + 1

  // Two independent switches before a single email goes out.
  if (!execute || !enabled) return out

  for (const c of plan.send as LeadForOutreach[]) {
    const token = c.extracted?._claimToken
    if (typeof token !== 'string' || !token) {
      out.errors.push(`lead ${c.id} has no claim token; skipped`)
      continue
    }
    const to = c.contact_email as string
    let unsubUrl: string
    try {
      unsubUrl = unsubscribeUrl(to, origin)
    } catch (err) {
      // OUTREACH_SECRET missing — no point continuing, nothing can be signed.
      out.errors.push(err instanceof Error ? err.message : String(err))
      break
    }

    try {
      await send({
        to,
        subject: 'A listing draft for your Ann Arbor sublet (not published)',
        text: outreachBody({
          title: c.title ?? 'your sublet',
          claimUrl: `${origin}/claim-listing/${token}`,
          unsubUrl,
        }),
        listUnsubscribe: unsubUrl,
      })
    } catch (err) {
      out.errors.push(`send failed for lead ${c.id}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    // Mark sent AND drop the raw claim token: the email is the only place it is
    // ever revealed, so it should not linger in our database afterwards.
    const { _claimToken: _dropped, ...rest } = c.extracted ?? {}
    void _dropped
    await db
      .from('sourced_leads')
      .update({ status: 'contacted', outreach_sent_at: new Date().toISOString(), extracted: rest })
      .eq('id', c.id)
    out.sent += 1
  }

  return out
}
