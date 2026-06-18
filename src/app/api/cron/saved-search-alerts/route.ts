import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import {
  savedSearchAlertEmail,
  type AlertListing,
} from '@/lib/email/saved-search-template'
import type { SavedSearch } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 60 // seconds — cron can be slow

/**
 * GET /api/cron/saved-search-alerts
 *
 * Scheduled hourly by Vercel Cron (see vercel.json). For each
 * saved_search where email_alerts = true:
 *   1. Find listings created after last_alerted_at that match the
 *      stored filters.
 *   2. If any, email the user a digest.
 *   3. Update last_alerted_at so the next run doesn't re-send.
 *
 * Auth: Vercel sets `Authorization: Bearer $CRON_SECRET` on cron
 * invocations. We refuse anything without the matching secret, so a
 * public-internet caller can't spam the cron path.
 */
const HUMAN_FILTER_SUMMARY: Record<string, (v: string) => string> = {
  type: v => (v === 'sublet' ? 'Sublet' : 'Swap'),
  neighborhood: v => v,
  property_type: v => v,
  bedrooms: v => (v === '0' ? 'Studio' : `${v} bed`),
  furnished: () => 'Furnished',
  pets: () => 'Pets OK',
  min_price: v => `from $${v}`,
  max_price: v => `under $${v}`,
  available_from: v => `from ${v}`,
  q: v => `"${v}"`,
}

function summarizeFilters(filters: Record<string, string>): string {
  const parts = Object.entries(filters).map(([k, v]) =>
    HUMAN_FILTER_SUMMARY[k]?.(v) ?? `${k}: ${v}`,
  )
  return parts.length === 0 ? 'all listings' : parts.join(', ')
}

export async function GET(request: Request) {
  // Vercel Cron auth — header is "Authorization: Bearer <CRON_SECRET>"
  // (Vercel auto-injects the value of the env var). In local dev the
  // user can set CRON_SECRET in .env.local and curl with that header.
  // Fail closed: if the secret isn't configured we reject everything rather
  // than comparing against "Bearer undefined" (which a caller could forge).
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Load active saved searches. Cap at 500 per run for safety —
  // anything more and the function probably times out anyway.
  const { data: searches } = await service
    .from('saved_searches')
    .select('*')
    .eq('email_alerts', true)
    .limit(500)

  if (!searches || searches.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, emailed: 0 })
  }

  let emailed = 0
  for (const s of searches as SavedSearch[]) {
    try {
      const matches = await findMatches(service, s)
      if (matches.length === 0) {
        // Still bump last_alerted_at so we don't keep scanning the
        // same window forever as time moves forward.
        await service
          .from('saved_searches')
          .update({ last_alerted_at: new Date().toISOString() })
          .eq('id', s.id)
        continue
      }

      // Lookup the user's email + first name.
      const { data: u } = await service
        .from('users')
        .select('email, full_name')
        .eq('id', s.user_id)
        .maybeSingle()
      if (!u?.email) continue

      const { subject, html } = savedSearchAlertEmail({
        consumerName: u.full_name,
        searchSummary: summarizeFilters(s.filters ?? {}),
        listings: matches.slice(0, 5), // cap inline to keep emails light
      })

      const { ok } = await sendEmail({ to: u.email, subject, html })
      if (ok) emailed++

      await service
        .from('saved_searches')
        .update({ last_alerted_at: new Date().toISOString() })
        .eq('id', s.id)
    } catch (err) {
      // Log and move on — one bad search shouldn't block the rest.
      console.error('[saved-search-alerts] one search threw', { id: s.id, err })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: searches.length,
    emailed,
  })
}

/**
 * Build a Supabase query against `listings` from the stored filter
 * combo + the since timestamp.
 */
async function findMatches(
  service: ReturnType<typeof createServiceClient>,
  search: SavedSearch,
): Promise<AlertListing[]> {
  let q = service
    .from('listings')
    .select(`
      id, title, price_per_month, neighborhood, bedrooms,
      listing_images ( storage_path, display_order )
    `)
    .eq('status', 'active')
    .gt('created_at', search.last_alerted_at)
    .order('created_at', { ascending: false })
    .limit(10)

  const f = search.filters ?? {}
  if (f.type === 'sublet' || f.type === 'swap') q = q.eq('type', f.type)
  if (f.neighborhood) q = q.eq('neighborhood', f.neighborhood)
  if (f.property_type) q = q.eq('property_type', f.property_type)
  if (f.residence_name) q = q.eq('residence_name', f.residence_name)
  if (f.bedrooms) q = q.eq('bedrooms', parseInt(f.bedrooms))
  if (f.min_price) q = q.gte('price_per_month', parseInt(f.min_price) * 100)
  if (f.max_price) q = q.lte('price_per_month', parseInt(f.max_price) * 100)
  if (f.available_from) q = q.lte('available_from', f.available_from)
  if (f.furnished === 'true') q = q.eq('furnished', true)
  if (f.pets === 'true') q = q.eq('pets_allowed', true)
  if (f.q) {
    const safe = f.q.replace(/[,()\\]/g, ' ').trim().slice(0, 80)
    if (safe) {
      q = q.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,neighborhood.ilike.%${safe}%`,
      )
    }
  }

  const { data } = await q
  return ((data ?? []) as unknown as Array<{
    id: string
    title: string
    price_per_month: number | null
    neighborhood: string | null
    bedrooms: number | null
    listing_images: { storage_path: string; display_order: number }[]
  }>).map(l => {
    const first = l.listing_images
      ?.slice()
      .sort((a, b) => a.display_order - b.display_order)
      .at(0)
    return {
      id: l.id,
      title: l.title,
      price_per_month: l.price_per_month,
      neighborhood: l.neighborhood,
      bedrooms: l.bedrooms,
      first_image_path: first?.storage_path ?? null,
    }
  })
}
