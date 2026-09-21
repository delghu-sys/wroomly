import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeLeads, type SourceAdapter } from './source-adapter.ts'
import {
  planOutreach,
  normalizeEmail,
  type OutreachCandidate,
  type SkipReason,
} from './outreach-policy.ts'
import { unsubscribeUrl } from './unsubscribe-token.ts'
import {
  generateClaimToken,
  hashClaimToken,
  claimTokenExpiry,
  isClaimTokenExpired,
} from '../listing-import/claim-token.ts'
import { cmbResidentSublets } from './sources/cmb-resident-sublets.ts'
import { offcampusUniverse } from './sources/offcampus-universe.ts'
import { leadToExtractedDraft, type AnyExtracted } from './to-draft.ts'
import { buildOutreachEmail, DEFAULT_TEMPLATE, type OutreachTemplate } from './outreach-template.ts'

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

export const SOURCES: SourceAdapter[] = [cmbResidentSublets, offcampusUniverse]

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

    // Hand the adapter what we already hold so it can skip those BEFORE
    // fetching. For a sitemap-driven source that is the difference between one
    // request per run and a hundred.
    const { data: known } = await db
      .from('sourced_leads')
      .select('source_external_id')
      .eq('source', adapter.key)
    const knownIds = new Set(
      (known ?? []).map((r: { source_external_id: string }) => r.source_external_id),
    )

    let raw
    try {
      raw = await adapter.fetchLeads({ knownIds })
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
    const draft = leadToExtractedDraft({
      title: lead.title,
      sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
      contactEmail: lead.contact_email,
      extracted: lead.extracted as AnyExtracted,
    })
    const { data: req, error: reqErr } = await db
      .from('listing_import_requests')
      .insert({
        email: lead.contact_email,
        personal_source_url: lead.source_url,
        // Facts only. `consent_confirmed` stays FALSE: the resident has not
        // agreed to anything yet — claiming the draft is that consent.
        consent_confirmed: false,
        // 'completed', NOT 'pending': agent-sourced drafts skip the AI
        // importer's awaiting_admin_review -> approve step entirely (that step
        // mints its own token and sends its own email — this pipeline already
        // owns both, via outreach.mjs). The claim page requires status ===
        // 'completed' before it will render anything; leaving this as
        // 'pending' meant every claim link this agent ever sent 404'd.
        status: 'completed',
        extracted_data: draft,
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
  /** The FULL rendered email (subject + text) for the first planned
   *  recipient, real claim link included — rendered on every call, execute
   *  or not, so Preview answers "what will this actually say" directly
   *  rather than just a count. Null when nothing is queued to send. */
  sample: { subject: string; text: string } | null
}

/**
 * True only for an origin a stranger could actually open.
 *
 * Every outreach email is built around one link, and the token in it is
 * dropped from the database once sent — so a wrong origin cannot be resent,
 * it just burns the lead. https-only and no loopback/.local/.internal hosts:
 * the dev values that would otherwise ride along from a local env file.
 */
export function isPublicOrigin(origin: string): boolean {
  let u: URL
  try {
    u = new URL(origin)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') return false
  if (host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.internal')) return false
  return true
}

/** The template row is service-role only, same as everything else here. Falls
 *  back to DEFAULT_TEMPLATE when nothing has been saved yet — outreach must
 *  never fail (or send blank emails) just because no one has visited the
 *  editor. Exported so the admin API can load the same row the same way. */
export async function loadOutreachTemplate(db: Db): Promise<OutreachTemplate> {
  const { data } = await db
    .from('outreach_template')
    .select('subject, body')
    .eq('id', 'default')
    .maybeSingle()
  return data ?? DEFAULT_TEMPLATE
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
    sample: null,
  }
  const template = await loadOutreachTemplate(db)

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

  // A real preview of the actual next email — computed on EVERY call,
  // Preview included, so "what will this say" is answered directly rather
  // than only a count. The claim link is the real one that lead will get.
  const first = plan.send[0] as LeadForOutreach | undefined
  const firstToken = first?.extracted?._claimToken
  if (first && typeof firstToken === 'string' && firstToken) {
    out.sample = buildOutreachEmail(template, {
      title: first.title ?? 'your sublet',
      claimUrl: `${origin}/claim-listing/${firstToken}`,
    })
  }

  // Two independent switches before a single email goes out.
  if (!execute || !enabled) return out

  // Third gate, and the reason it exists: the claim link IS the email. A run
  // started from a laptop inherits NEXT_PUBLIC_APP_URL=http://localhost:3000,
  // which would mail real strangers a link only that laptop can open — a
  // one-shot, unrecoverable waste of every lead in the batch, since the token
  // is dropped after sending. Dry runs still render the localhost link above
  // so it stays visible; only real sends are refused.
  if (!isPublicOrigin(origin)) {
    out.errors.push(
      `Refusing to send: origin "${origin}" is not a public https URL, so every claim link would be dead. ` +
        'Set NEXT_PUBLIC_APP_URL to the live site (or pass --origin https://wroomly.app).',
    )
    return out
  }

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

    // unsubUrl is no longer in the email body/subject — buildOutreachEmail
    // has no footer — but it's still sent as the List-Unsubscribe header
    // below: an invisible technical header (not something the recipient
    // reads as part of the message) that mail providers use for spam
    // scoring. Dropping it too would risk Gmail/Yahoo bulk-sender filtering
    // on top of the CAN-SPAM exposure already accepted by removing the
    // visible footer.
    const email = buildOutreachEmail(template, {
      title: c.title ?? 'your sublet',
      claimUrl: `${origin}/claim-listing/${token}`,
    })

    try {
      await send({ to, subject: email.subject, text: email.text, listUnsubscribe: unsubUrl })
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

// ── test send ───────────────────────────────────────────────────────────────

type LeadWithSource = LeadForOutreach & { source: string; source_url: string | null }

export interface TestSendCheck {
  label: string
  ok: boolean
}

export interface TestSendResult {
  /** The lead whose email was reproduced. `contactDomain` only — the real
   *  address is never returned to a caller, only its domain. */
  lead: {
    id: string
    title: string | null
    source: string
    sourceUrl: string | null
    contactDomain: string | null
  } | null
  /** Everything the claim page will check when the link is clicked, checked
   *  BEFORE sending so a broken link is never mailed. */
  linkChecks: TestSendCheck[]
  email: { to: string; subject: string; text: string; listUnsubscribe: string } | null
  sent: boolean
  /** Leads passed over because their claim link would not have resolved. */
  skippedLeads: number
  error?: string
}

/** Exactly what /claim-listing/[token] checks when the link is opened. Run
 *  BEFORE mailing a link, so a dead one is never sent. */
async function claimLinkChecks(db: Db, token: string): Promise<TestSendCheck[]> {
  const { data: req } = await db
    .from('listing_import_requests')
    .select('id, status, claim_token_expires_at, extracted_data, claimed_by_user_id')
    .eq('claim_token_hash', hashClaimToken(token))
    .maybeSingle()
  const r = req as {
    status?: string
    claim_token_expires_at?: string | null
    extracted_data?: { photos?: unknown } | null
    claimed_by_user_id?: string | null
  } | null

  return [
    { label: 'import request found', ok: Boolean(r) },
    { label: "status is 'completed'", ok: r?.status === 'completed' },
    { label: 'extracted_data present', ok: Boolean(r?.extracted_data) },
    { label: 'photos is an array', ok: Array.isArray(r?.extracted_data?.photos) },
    { label: 'token not expired', ok: !isClaimTokenExpired(r?.claim_token_expires_at) },
    { label: 'not already claimed', ok: !r?.claimed_by_user_id },
  ]
}

/**
 * Send ONE real outreach email to an address the caller controls.
 *
 * Everything is the real thing: the lead planOutreach() would mail first, the
 * saved template, the body buildOutreachEmail() produces, that lead's live
 * claim token, and the same List-Unsubscribe header. Only two things differ
 * from a production send, both deliberate:
 *
 *   1. the recipient is `to`, not the lead's own address
 *   2. the lead row is NOT mutated — not marked `contacted`, token not
 *      dropped. A test must never burn a real lead: afterwards that person
 *      can still be contacted for real, with a link that still works.
 *
 * Refuses to mail any address belonging to a lead, any suppressed address, or
 * a claim link that would not resolve.
 */
export async function runTestSend(
  db: Db,
  {
    to,
    send,
    execute,
    leadId,
    origin = 'https://wroomly.app',
  }: { to: string; send: SendEmail; execute: boolean; leadId?: string; origin?: string },
): Promise<TestSendResult> {
  const out: TestSendResult = { lead: null, linkChecks: [], email: null, sent: false, skippedLeads: 0 }
  const target = normalizeEmail(to)
  if (!target) return { ...out, error: 'No address given.' }

  const [{ data: leads, error }, { data: sups }] = await Promise.all([
    db
      .from('sourced_leads')
      .select(
        'id, contact_email, status, import_request_id, outreach_sent_at, title, source, source_url, extracted',
      )
      .limit(200),
    db.from('outreach_suppressions').select('email'),
  ])
  if (error) return { ...out, error: error.message }

  const all = (leads ?? []) as LeadWithSource[]
  const suppressed = (sups ?? []).map((s: { email: string }) => s.email)

  // Never let a "test" become a real, unlogged send to a stranger.
  if (all.some(l => normalizeEmail(l.contact_email) === target)) {
    return { ...out, error: 'That address belongs to a real lead. Test sends go to your own inbox only.' }
  }
  if (suppressed.map(normalizeEmail).includes(target)) {
    return { ...out, error: 'That address is on the suppression list.' }
  }

  const plan = planOutreach({
    candidates: all.filter(l => l.status === 'drafted' && !l.outreach_sent_at),
    suppressed,
    sentInLastDay: 0,
    dailyCap: 1000,
  })
  if (plan.send.length === 0) {
    return { ...out, error: 'Nothing is queued — no drafted lead with a contact email.' }
  }

  const candidates = (leadId
    ? plan.send.filter(l => l.id === leadId)
    : plan.send) as LeadWithSource[]
  if (candidates.length === 0) {
    return { ...out, error: `Lead ${leadId} is not in the send plan.` }
  }

  // Walk the queue until a lead whose claim link actually resolves. A draft
  // that was already claimed (often by the admin, checking an earlier test)
  // makes THAT lead unusable, not the whole test — there are usually others
  // sitting right behind it. An explicit --lead/leadId is never substituted:
  // asking for one specific lead and silently getting a different one would
  // be worse than an error. Bounded so a long queue of dead drafts cannot
  // turn one click into hundreds of round trips.
  const probeLimit = leadId ? 1 : 25
  let chosen: { lead: LeadWithSource; token: string } | null = null

  for (const candidate of candidates.slice(0, probeLimit)) {
    const token = candidate.extracted?._claimToken
    const checks =
      typeof token === 'string' && token
        ? await claimLinkChecks(db, token)
        : [{ label: 'draft has a claim token', ok: false }]

    // Always report the checks for the lead actually under consideration, so
    // a total failure explains itself with the LAST thing tried.
    out.lead = {
      id: candidate.id,
      title: candidate.title,
      source: candidate.source,
      sourceUrl: candidate.source_url,
      contactDomain: candidate.contact_email ? candidate.contact_email.split('@').pop() ?? null : null,
    }
    out.linkChecks = checks

    if (checks.every(c => c.ok)) {
      chosen = { lead: candidate, token: token as string }
      break
    }
    out.skippedLeads += 1
  }

  if (!chosen) {
    return {
      ...out,
      error:
        out.skippedLeads > 1
          ? `No sendable draft: checked ${out.skippedLeads} lead(s) and every claim link would break. The last one is shown above.`
          : 'The claim link would not resolve — refusing to send a broken email.',
    }
  }
  const { lead, token } = chosen

  const template = await loadOutreachTemplate(db)
  const built = buildOutreachEmail(template, {
    title: lead.title ?? 'your sublet',
    claimUrl: `${origin}/claim-listing/${token}`,
  })
  // Header only — nothing in the body depends on this. Still fatal for a
  // send: a missing OUTREACH_SECRET means the real agent is broken too, and
  // the console should say so in words rather than throw a 500.
  let listUnsubscribe: string
  try {
    listUnsubscribe = unsubscribeUrl(to, origin)
  } catch (err) {
    return { ...out, error: err instanceof Error ? err.message : String(err) }
  }
  out.email = { to, subject: built.subject, text: built.text, listUnsubscribe }

  if (out.linkChecks.some(c => !c.ok)) {
    return { ...out, error: 'The claim link would not resolve — refusing to send a broken email.' }
  }
  if (!execute) return out

  try {
    await send({ to, subject: built.subject, text: built.text, listUnsubscribe })
    out.sent = true
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err)
  }
  return out
}
