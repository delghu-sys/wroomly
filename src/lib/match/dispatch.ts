import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import {
  matchAlertEmail,
  unsubscribeUrl,
  type MatchEmailListing,
} from '@/lib/email/match-template'
import {
  scoreListing,
  matchReasonLine,
  type MatchableListing,
} from '@/lib/match/engine'
import type { MatchAlert } from '@/types/database'

/**
 * Wroomly Match — matching + email dispatch.
 *
 * Two entry points share one core:
 *   - dispatchInstantForListing(listingId): the fast path, fired (fire-and-
 *     forget) the moment a user listing goes active. Emails 'instant' alerts.
 *   - runMatchAlerts(): the daily cron. Sends 'daily' digests and doubles as a
 *     catch-up for any instant match that failed to send.
 *
 * Dedupe is insert-first: we claim the (alert, listing) row in match_alert_sends
 * (unique constraint) BEFORE emailing, so a crash or a concurrent run can never
 * send the same listing to the same renter twice.
 */

type Service = ReturnType<typeof createServiceClient>

const LISTING_SELECT = `
  id, type, title, price_per_month, bedrooms, bathrooms,
  available_from, available_to, neighborhood, furnished, pets_allowed,
  status, source,
  listing_amenities ( amenity ),
  listing_images ( storage_path, display_order )
`

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
  furnished: boolean
  pets_allowed: boolean
  status: string
  source: string
  listing_amenities: { amenity: string }[] | null
  listing_images: { storage_path: string; display_order: number }[] | null
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

function toEmailListing(l: RawListing, reason: string): MatchEmailListing {
  return {
    id: l.id,
    title: l.title,
    price_per_month: l.price_per_month,
    neighborhood: l.neighborhood,
    bedrooms: l.bedrooms,
    available_from: l.available_from,
    available_to: l.available_to,
    first_image_path: firstImagePath(l),
    reason,
  }
}

/**
 * Claim (alert, listing) pairs in the send ledger, returning only the ones that
 * were NOT already sent. Insert-first dedupe — the unique constraint makes this
 * the single source of truth for "already emailed."
 */
async function claimUnsent(
  service: Service,
  alertId: string,
  scored: { listing: RawListing; score: number; reason: string }[],
): Promise<{ listing: RawListing; reason: string }[]> {
  const fresh: { listing: RawListing; reason: string }[] = []
  for (const s of scored) {
    const { data } = await service
      .from('match_alert_sends')
      .upsert(
        { alert_id: alertId, listing_id: s.listing.id, score: s.score },
        { onConflict: 'alert_id,listing_id', ignoreDuplicates: true },
      )
      .select('id')
    if (data && data.length > 0) fresh.push({ listing: s.listing, reason: s.reason })
  }
  return fresh
}

/** Send one alert email (single or digest) for the given already-claimed listings. */
async function emailAlert(
  alert: MatchAlert,
  rows: { listing: RawListing; reason: string }[],
): Promise<boolean> {
  if (rows.length === 0) return false
  const emailListings = rows.map(r => toEmailListing(r.listing, r.reason))
  const { subject, html } = matchAlertEmail({
    listings: emailListings,
    token: alert.manage_token,
  })
  const { ok } = await sendEmail({
    to: alert.email,
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(alert.manage_token)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  return ok
}

/** Score a listing against an alert; returns the match or null. */
function scoreFor(
  listing: RawListing,
  alert: MatchAlert,
): { listing: RawListing; score: number; reason: string } | null {
  const result = scoreListing(toMatchable(listing), alert.criteria)
  if (!result.pass) return null
  return { listing, score: result.score, reason: matchReasonLine(result.reasons) }
}

/**
 * INSTANT path — a single user listing just went active. Email every active
 * 'instant' alert it matches (and hasn't already been sent). Fire-and-forget
 * from the listing-activation routes; never throws into the caller.
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
        const fresh = await claimUnsent(service, alert.id, [scored])
        await emailAlert(alert, fresh)
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
 * CRON path — daily digests + catch-up. For every active alert, find user
 * listings created since its last_matched_at that match and haven't been sent,
 * email them (digest when several), and bump last_matched_at. Deduping means
 * the instant alerts processed here are almost always no-ops (already sent).
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
        .filter((s): s is NonNullable<typeof s> => s !== null)

      const fresh = await claimUnsent(service, alert.id, scored)
      if (fresh.length > 0) {
        const ok = await emailAlert(alert, fresh)
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
