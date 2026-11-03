import type { SupabaseClient } from '@supabase/supabase-js'
import { SOURCES, isPublicOrigin, mintClaimToken } from './runner.ts'
import { leadToExtractedDraft, type AnyExtracted } from './to-draft.ts'
import { claimTokenExpiry } from '../listing-import/claim-token.ts'
import {
  addMessage, nextStep, readManual, setState, startThread,
  type ManualMessage, type ManualState, type ManualThread, type NextStep,
} from './manual-outreach.ts'

/**
 * The database side of manual outreach: record what was sent and what came
 * back, and turn a lead into a draft with a claim link a person can paste into
 * the other site's messenger. Nothing here sends anything.
 */

type Db = SupabaseClient

interface LeadRow {
  id: string
  source: string
  source_url: string | null
  title: string | null
  status: string
  contact_email: string | null
  import_request_id: string | null
  extracted: Record<string, unknown> | null
}

async function getLead(db: Db, id: string): Promise<LeadRow> {
  const { data, error } = await db
    .from('sourced_leads')
    .select('id, source, source_url, title, status, contact_email, import_request_id, extracted')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Lead not found.')
  return data as LeadRow
}

async function saveThread(db: Db, lead: LeadRow, thread: ManualThread, extra: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db
    .from('sourced_leads')
    .update({ extracted: { ...(lead.extracted ?? {}), manual: thread }, ...extra })
    .eq('id', lead.id)
  if (error) throw new Error(error.message)
}

/** Record that the first message went out. Marks the lead contacted. A second
 *  call for the same lead is refused: the first message is only ever sent once. */
export async function recordFirstContact(
  db: Db,
  opts: { source: string; externalId: string; channel: string; channelLabel: string; conversationUrl?: string; text: string; at?: Date },
): Promise<{ id: string }> {
  const { data, error } = await db
    .from('sourced_leads')
    .select('id, source, source_url, title, status, contact_email, import_request_id, extracted')
    .eq('source', opts.source)
    .eq('source_external_id', opts.externalId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`No lead ${opts.source}/${opts.externalId}. Run discovery first.`)
  const lead = data as LeadRow
  if (readManual(lead.extracted)) throw new Error('This lead already has a message recorded.')
  const at = (opts.at ?? new Date()).toISOString()
  await saveThread(
    db, lead,
    startThread({ channel: opts.channel, channelLabel: opts.channelLabel, conversationUrl: opts.conversationUrl, text: opts.text, at }),
    { status: 'contacted', outreach_sent_at: at },
  )
  return { id: lead.id }
}

export async function addManualMessage(db: Db, leadId: string, msg: ManualMessage): Promise<ManualThread> {
  const lead = await getLead(db, leadId)
  const t = readManual(lead.extracted)
  if (!t) throw new Error('This lead has no recorded conversation.')
  const next = addMessage(t, msg)
  await saveThread(db, lead, next)
  return next
}

export async function setManualState(db: Db, leadId: string, state: ManualState): Promise<ManualThread> {
  const lead = await getLead(db, leadId)
  const t = readManual(lead.extracted)
  if (!t) throw new Error('This lead has no recorded conversation.')
  const next = setState(t, state)
  await saveThread(db, lead, next)
  return next
}

/** A placeholder for the draft's `email` column, which is NOT NULL. `.invalid`
 *  can never be delivered, and the claim page does not use it. */
const placeholderEmail = (leadId: string) => `${leadId}@manual.invalid`

/**
 * Make sure the lead has a draft listing and return a fresh claim link for it.
 *
 * The link lives seven days and replaces any earlier one. The raw token is
 * returned once and never stored (only its hash is), so the person pastes it
 * into the conversation now. Like every claim link, opening it changes
 * nothing: the draft is only claimed when the host takes a real action.
 */
export async function prepareClaimLink(db: Db, leadId: string, origin: string): Promise<{ url: string; expiresAt: string; createdDraft: boolean }> {
  if (!isPublicOrigin(origin)) {
    throw new Error(`Refusing to make a link: "${origin}" is not a public https address, so the link would be dead.`)
  }
  const lead = await getLead(db, leadId)
  if (lead.contact_email) throw new Error('This lead has an email address, so it goes through email outreach instead.')
  let importId = lead.import_request_id
  let createdDraft = false
  if (!importId) {
    const draft = leadToExtractedDraft({
      title: lead.title,
      sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
      contactEmail: null,
      extracted: lead.extracted as AnyExtracted,
    })
    const { data: req, error } = await db
      .from('listing_import_requests')
      .insert({
        email: placeholderEmail(lead.id),
        personal_source_url: lead.source_url,
        // Nobody has agreed to anything: claiming the draft is the consent.
        consent_confirmed: false,
        // 'completed' is what the claim page needs before it renders (see runDraft).
        status: 'completed',
        extracted_data: draft,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Could not create the draft: ${error.message}`)
    importId = req.id as string
    createdDraft = true
    const { error: upErr } = await db.from('sourced_leads').update({ import_request_id: importId }).eq('id', lead.id)
    if (upErr) throw new Error(upErr.message)
  }
  const token = await mintClaimToken(db, importId)
  const issued = new Date()
  const t = readManual(lead.extracted)
  if (t) {
    const { data: fresh } = await db.from('sourced_leads').select('extracted').eq('id', lead.id).maybeSingle()
    await saveThread(db, { ...lead, extracted: (fresh as { extracted: Record<string, unknown> } | null)?.extracted ?? lead.extracted }, { ...t, claimLinkIssuedAt: issued.toISOString() })
  }
  return { url: `${origin.replace(/\/$/, '')}/claim-listing/${token}`, expiresAt: claimTokenExpiry(issued).toISOString(), createdDraft }
}

// ── reading ─────────────────────────────────────────────────────────────────

export interface ManualItem {
  id: string
  title: string
  sourceUrl: string | null
  price: string | null
  dates: string | null
  thread: ManualThread
  next: NextStep
  hasDraft: boolean
}

/** Every lead contacted by hand, those needing action first. */
export async function loadManualItems(db: Db, now = new Date()): Promise<ManualItem[]> {
  const { data, error } = await db
    .from('sourced_leads')
    .select('id, source, source_url, title, status, contact_email, import_request_id, extracted')
    .eq('status', 'contacted')
    .is('contact_email', null)
    .order('outreach_sent_at', { ascending: false })
  if (error) throw new Error(error.message)
  const items: ManualItem[] = []
  for (const row of (data ?? []) as LeadRow[]) {
    const thread = readManual(row.extracted)
    if (!thread) continue
    const x = row.extracted ?? {}
    items.push({
      id: row.id,
      title: row.title ?? 'Untitled',
      sourceUrl: row.source_url,
      price: typeof x.price === 'string' ? x.price : null,
      dates: typeof x.dates === 'string' ? x.dates : null,
      thread,
      next: nextStep(thread, now),
      hasDraft: !!row.import_request_id,
    })
  }
  const rank = (i: ManualItem) => (i.next.due ? 0 : i.next.kind === 'wait' ? 1 : 2)
  return items.map((it, idx) => ({ it, idx })).sort((a, b) => rank(a.it) - rank(b.it) || a.idx - b.idx).map(x => x.it)
}
