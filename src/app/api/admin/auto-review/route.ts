import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { reviewListing, type ListingForReview } from '@/lib/reviewers/listing-reviewer'
import type { Listing, ListingImage, ListingAmenity } from '@/types/database'
import { getListingImageUrl as imageUrl } from '@/lib/utils/listing'
import { dispatchInstantForListing } from '@/lib/match/dispatch'

export const runtime = 'nodejs'
export const maxDuration = 60

interface BodyShape {
  listingId?: string
  sweep?: boolean
}

async function reviewOne(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  listingId: string
) {
  const { data: listing } = await service
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      users:supplier_id(id, full_name, email)
    `)
    .eq('id', listingId)
    .single()

  if (!listing) return { listingId, error: 'not_found' as const }

  const l = listing as Listing & {
    listing_images: ListingImage[]
    listing_amenities: ListingAmenity[]
  }

  if (l.status !== 'pending_review') {
    return { listingId, skipped: true, reason: `status=${l.status}` }
  }

  const payload: ListingForReview = {
    title: l.title,
    description: l.description,
    neighborhood: l.neighborhood,
    address: l.address,
    city: l.city,
    state: l.state,
    type: l.type,
    price_per_month: l.price_per_month,
    deposit_amount: l.deposit_amount,
    available_from: l.available_from,
    available_to: l.available_to,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    sq_ft: l.sq_ft,
    furnished: l.furnished,
    pets_allowed: l.pets_allowed,
    utilities_included: l.utilities_included,
    amenities: l.listing_amenities.map(a => ({ amenity: a.amenity })),
    image_urls: l.listing_images
      .sort((a, b) => a.display_order - b.display_order)
      .map(i => imageUrl(i.storage_path)),
  }

  const result = await reviewListing(payload)

  // Status transition: approve → active; reject → archived; manual → leave pending_review
  const nextStatus =
    result.decision === 'approve' ? 'active' :
    result.decision === 'reject' ? 'archived' :
    'pending_review'

  await service
    .from('listings')
    .update({
      status: nextStatus,
      auto_review_decision: result.decision,
      auto_review_reason: result.reason,
      auto_review_flags: result.flags,
      auto_reviewed_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  // Listing just went live → fire Wroomly Match alerts (fire-and-forget; the
  // dispatcher self-guards on source='user' and never throws).
  if (nextStatus === 'active') {
    void dispatchInstantForListing(listingId)
  }

  return { listingId, ...result, status: nextStatus }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as BodyShape

  // Caller auth: must be the owning supplier (during initial submission)
  // OR an admin (for manual sweeps from /admin/listings).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  const userType = (profile as { user_type?: string } | null)?.user_type
  const isAdmin = userType === 'admin'

  const service = await createServiceClient()

  // Sweep mode (admin only): review all currently pending listings
  if (body.sweep) {
    if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const { data: pending } = await service
      .from('listings')
      .select('id')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(20)

    const ids = ((pending ?? []) as { id: string }[]).map(p => p.id)
    const results = []
    try {
      for (const id of ids) {
        results.push(await reviewOne(service, id))
      }
    } catch (err) {
      return NextResponse.json(
        { error: humanizeReviewError(err), reviewed: results.length, results },
        { status: 502 }
      )
    }
    return NextResponse.json({ reviewed: results.length, results })
  }

  // Single listing mode
  if (!body.listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }

  // If not admin, caller must own the listing
  if (!isAdmin) {
    const { data: owner } = await service
      .from('listings')
      .select('supplier_id')
      .eq('id', body.listingId)
      .single()
    if (!owner || (owner as { supplier_id: string }).supplier_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  try {
    const result = await reviewOne(service, body.listingId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: humanizeReviewError(err) },
      { status: 502 }
    )
  }
}

/**
 * Translate raw Anthropic / SDK errors into messages an admin can act on
 * from the toast in /admin/listings. The full stack is still logged to
 * Vercel for debugging — this is just the user-facing summary.
 */
function humanizeReviewError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[auto-review] reviewListing failed:', err)

  if (msg.includes('ANTHROPIC_API_KEY')) {
    return 'AI moderation is not configured (missing API key). Reviews will be manual until this is set.'
  }
  if (msg.includes('credit balance is too low')) {
    return 'Anthropic credit balance is too low. Top up at console.anthropic.com → Billing.'
  }
  if (msg.includes('invalid x-api-key') || msg.includes('authentication')) {
    return 'Anthropic API key is invalid or revoked. Rotate it in Vercel.'
  }
  if (msg.includes('not_found_error') && msg.includes('model')) {
    return 'AI model name is invalid (deprecated?). Tell engineering to update lib/reviewers/listing-reviewer.ts.'
  }
  if (msg.includes('rate_limit')) {
    return 'Anthropic rate limit hit. Try again in a minute.'
  }
  return `AI review failed: ${msg.slice(0, 200)}`
}
