import 'server-only'
import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import {
  matchAlertEmail,
  unsubscribeUrl,
  type MatchEmailListing,
} from '@/lib/email/match-template'
import { scoreListing, type MatchableListing, type MatchResult } from '@/lib/match/engine'
import { resolveProfile } from '@/lib/match/profile'
import { writeMatchNotes, type NoteListingInput } from '@/lib/match/notes'
import type { MatchAlert, MatchProfile } from '@/types/database'

/**
 * Wroomly Match v2 — scoring + personal-email dispatch.
 *
 * Two entry points share one core:
 *   - dispatchInstantForListing(listingId): the fast path, fired (fire-and-
 *     forget) the moment a user listing goes active. Emails 'instant' alerts.
 *   - runMatchAlerts(): the daily cron. Sends ranked "top N" digests to
 *     'daily' alerts and doubles as a catch-up for failed instant sends.
 *
 * Per send: the engine scores the listing 0–100 against the alert's weighted
 * profile; passes are claimed in the dedupe ledger (insert-first, unique
 * constraint — a listing can never be emailed twice); the LLM writes a
 * personal note per listing grounded in the engine's fit/miss reasons; the
 * send row records score + reasons + note for the manage page and feedback.
 */

type Service = ReturnType<typeof createServiceClient>

const LISTING_SELECT = `
  id, type, title, price_per_month, bedrooms, bathrooms,
  available_from, available_to, neighborhood, lat, lng, furnished,
  pets_allowed, status, source,
  listing_amenities ( amenity ),
  listing_images ( storage_path, display_order )
`

/** Digest size for the ranked "your top N" email. */
const DIGEST_TOP_N = 3

interface RawListing {
  id: string
  type: string
  title: string
  price_per_month: number | null
  bedrooms: number | null
  bathrooms: number | null
  available_from: string
  available_to: string
  neighborhood: string | null
  lat: number | null
  lng: number | null
  furnished: boolean
  pets_allowed: boolean
  status: string
  source: string
  listing_amenities: { amenity: string }[] | null
  listing_images: { storage_path: string; display_order: number }[] | null
}

interface ScoredListing {
  listing: RawListing
  result: MatchResult
}

interface ClaimedListing extends ScoredListing {
  sendId: string
}

function toMatchable(l: RawListing): MatchableListing {
  return {
    id: l.id,
    type: l.type,
    title: l.title,
    price_per_month: l.price_per_month,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    available_from: l.available_from,
    available_to: l.available_to,
    neighborhood: l.neighborhood,
    lat: l.lat,
    lng: l.lng,
    furnished: l.furnished,
    pets_allowed: l.pets_allowed,
    amenities: (l.listing_amenities ?? []).map(a => a.amenity),
  }
}

function firstImagePath(l: RawListing): string | null {
  const first = (l.listing_images ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .at(0)
  return first?.storage_path ?? null
}

function toNoteInput(s: ScoredListing): NoteListingInput {
  return {
    id: s.listing.id,
    title: s.listing.title,
    price_per_month: s.listing.price_per_month,
    neighborhood: s.listing.neighborhood,
    bedrooms: s.listing.bedrooms,
    available_from: s.listing.available_from,
    available_to: s.listing.available_to,
    score: s.result.score,
    fits: s.result.fits,
    misses: s.result.misses,
  }
}

/** Score a listing against an alert's weighted profile; null unless it passes. */
function scoreFor(listing: RawListing, alert: MatchAlert): ScoredListing | null {
  const profile = resolveProfile(alert.profile, alert.criteria)
  const result = scoreListing(toMatchable(listing), profile)
  return result.pass ? { listing, result } : null
}

/**
 * Claim (alert, listing) pairs in the send ledger, returning only rows that
 * were NOT already sent, with their send ids. Insert-first dedupe — the unique
 * constraint makes this the single source of truth for "already emailed."
 */
async function claimUnsent(
  service: Service,
  alertId: string,
  scored: ScoredListing[],
  digestKey: string | null,
): Promise<ClaimedListing[]> {
  const fresh: ClaimedListing[] = []
  for (const s of scored) {
    const { data } = await service
      .from('match_alert_sends')
      .upsert(
        {
          alert_id: alertId,
          listing_id: s.listing.id,
          score: s.result.score,
          reasons: [...s.result.fits, ...s.result.misses],
          digest_key: digestKey,
        },
        { onConflict: 'alert_id,listing_id', ignoreDuplicates: true },
      )
      .select('id')
    if (data && data.length > 0) fresh.push({ ...s, sendId: data[0].id as string })
  }
  return fresh
}

/**
 * Write the personal notes, persist them on the send rows, and email the
 * ranked listings (best-first). Returns whether the email went out.
 */
async function emailAlert(
  service: Service,
  alert: MatchAlert,
  profile: MatchProfile,
  claimed: ClaimedListing[],
): Promise<boolean> {
  if (claimed.length === 0) return false
  const ranked = [...claimed].sort((a, b) => b.result.score - a.result.score)

  const { subject, notes } = await writeMatchNotes(
    profile,
    ranked.map(toNoteInput),
  )

  // Persist each note for the manage page + audit (best-effort).
  for (const c of ranked) {
    const note = notes.get(c.listing.id)
    if (note) {
      await service.from('match_alert_sends').update({ note }).eq('id', c.sendId)
    }
  }

  const emailListings: MatchEmailListing[] = ranked.map(c => ({
    id: c.listing.id,
    title: c.listing.title,
    price_per_month: c.listing.price_per_month,
    neighborhood: c.listing.neighborhood,
    bedrooms: c.listing.bedrooms,
    available_from: c.listing.available_from,
    available_to: c.listing.available_to,
    first_image_path: firstImagePath(c.listing),
    score: c.result.score,
    note: notes.get(c.listing.id) ?? '',
    send_id: c.sendId,
  }))

  const { subject: subj, html } = matchAlertEmail({
    listings: emailListings,
    subject,
    token: alert.manage_token,
  })
  const { ok } = await sendEmail({
    to: alert.email,
    subject: subj,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(alert.manage_token)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  return ok
}

/**
 * INSTANT path — a single user listing just went active. Email every active
 * 'instant' alert it scores above threshold for (and hasn't already been
 * sent). Fire-and-forget from the listing-activation routes; never throws
 * into the caller.
 */
export async function dispatchInstantForListing(listingId: string): Promise<void> {
  try {
    const service = createServiceClient()

    const { data: raw } = await service
      .from('listings')
      .select(LISTING_SELECT)
      .eq('id', listingId)
      .maybeSingle()
    const listing = raw as RawListing | null
    // Only real user supply triggers alerts — never seed/partner bulk inventory
    // (mirrors the saved-search cron) and only once it's actually live.
    if (!listing || listing.status !== 'active' || listing.source !== 'user') return

    const { data: alerts } = await service
      .from('match_alerts')
      .select('*')
      .eq('status', 'active')
      .eq('frequency', 'instant')
      .limit(2000)

    for (const alert of (alerts ?? []) as MatchAlert[]) {
      try {
        const scored = scoreFor(listing, alert)
        if (!scored) continue
        const fresh = await claimUnsent(service, alert.id, [scored], null)
        const profile = resolveProfile(alert.profile, alert.criteria)
        await emailAlert(service, alert, profile, fresh)
      } catch (err) {
        console.error('[match/dispatch] instant alert failed', { alertId: alert.id, err })
      }
    }
  } catch (err) {
    // Never let matching break the listing-activation flow that called us.
    console.error('[match/dispatch] instant dispatch failed', { listingId, err })
  }
}

/**
 * CRON path — ranked digests + catch-up. For every active alert, score user
 * listings created since its last_matched_at, rank the passes by score, and
 * email the top N as one digest ("Your top 3"). Deduping means instant alerts
 * processed here are almost always no-ops (already sent).
 */
export async function runMatchAlerts(): Promise<{ processed: number; emailed: number }> {
  const service = createServiceClient()
  const { data: alerts } = await service
    .from('match_alerts')
    .select('*')
    .eq('status', 'active')
    .limit(1000)

  let emailed = 0
  const list = (alerts ?? []) as MatchAlert[]

  for (const alert of list) {
    try {
      const { data: rawListings } = await service
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .eq('source', 'user')
        .gt('created_at', alert.last_matched_at)
        .order('created_at', { ascending: false })
        .limit(40)

      const candidates = (rawListings ?? []) as RawListing[]
      const scored = candidates
        .map(l => scoreFor(l, alert))
        .filter((s): s is ScoredListing => s !== null)
        .sort((a, b) => b.result.score - a.result.score)
        .slice(0, DIGEST_TOP_N)

      const digestKey = scored.length > 1 ? randomUUID() : null
      const fresh = await claimUnsent(service, alert.id, scored, digestKey)
      if (fresh.length > 0) {
        const profile = resolveProfile(alert.profile, alert.criteria)
        const ok = await emailAlert(service, alert, profile, fresh)
        if (ok) emailed++
      }

      await service
        .from('match_alerts')
        .update({ last_matched_at: new Date().toISOString() })
        .eq('id', alert.id)
    } catch (err) {
      console.error('[match/dispatch] cron alert failed', { alertId: alert.id, err })
    }
  }

  return { processed: list.length, emailed }
}
