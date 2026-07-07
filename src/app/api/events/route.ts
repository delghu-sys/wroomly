import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Public, anonymous funnel-event sink (see src/lib/track.ts). Deliberately
// boring: allowlisted event names, tiny props, a global rate cap, and an
// append-only service-role insert. Fire-and-forget on the client — this
// endpoint failing must never affect the product, so errors return quickly
// and quietly.

const EVENT_NAMES = [
  'import_started',
  'import_upload_done',
  'import_succeeded',
  'import_failed',
  'claim_viewed',
  'publish_attempted',
  'publish_succeeded',
  'publish_failed',
  'inquiry_sent',
  // Social/share (feature/social-share)
  'share_opened',
  'share_completed',
  'listing_viewed',
  // Wroomly Match funnel (feature/match-world-class)
  'match_chat_started',
  'match_chat_finished',
  'match_alert_created',
  'match_feedback_given',
] as const

const bodySchema = z.object({
  name: z.enum(EVENT_NAMES),
  props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
  sessionId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/).optional(),
})

// Coarse abuse ceiling — the table is append-only and unread by clients, so
// the only risk is junk volume. Well above legitimate traffic at this stage.
const GLOBAL_EVENTS_PER_HOUR = 5000

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 }) // never make the client care
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return new NextResponse(null, { status: 204 })
  if (JSON.stringify(parsed.data.props).length > 2000) {
    return new NextResponse(null, { status: 204 })
  }

  const service = createServiceClient()
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await service
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo)
  if ((count ?? 0) >= GLOBAL_EVENTS_PER_HOUR) {
    return new NextResponse(null, { status: 204 })
  }

  const { error } = await service.from('analytics_events').insert({
    name: parsed.data.name,
    props: parsed.data.props,
    session_id: parsed.data.sessionId ?? null,
  })
  if (error) {
    // Table missing (migration 031 not applied yet) or transient — log once
    // per invocation, never surface to the client.
    console.warn('[events] insert failed:', error.message)
  }
  return new NextResponse(null, { status: 204 })
}
