import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { ListingGallery } from '@/components/listings/ListingGallery'
import { ListingMap } from '@/components/listings/ListingMap'
import { InquiryForm } from '@/components/listings/InquiryForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, BedDouble, Bath, Maximize2, Calendar, Wifi, Car, PawPrint, Zap, ArrowLeftRight, Star } from 'lucide-react'
import { formatCents, formatDateRange } from '@/lib/utils/listing'
import { format, parseISO } from 'date-fns'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('listings').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Listing' }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users(id, full_name, avatar_url, university, created_at, bio)
    `)
    .eq('id', id)
    .in('status', ['active', 'rented', 'swapped'])
    .single()

  if (!listing) notFound()

  const l = listing as ListingWithDetails & {
    users: { id: string; full_name: string | null; avatar_url: string | null; university: string | null; created_at: string; bio: string | null }
  }

  // Aggregate supplier rating
  const { data: supplierReviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', l.supplier_id)

  const supplierReviewCount = supplierReviews?.length ?? 0
  const supplierRatingAvg =
    supplierReviewCount > 0
      ? (supplierReviews as { rating: number }[]).reduce((a, r) => a + r.rating, 0) / supplierReviewCount
      : null

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const isOwner = authUser?.id === l.supplier_id

  // Check if consumer already has an inquiry on this listing, and its conversation
  let existingInquiry: { id: string; status: string } | null = null
  let conversationId: string | null = null
  if (authUser && !isOwner) {
    const { data } = await supabase
      .from('inquiries')
      .select('id, status')
      .eq('listing_id', id)
      .eq('consumer_id', authUser.id)
      .single()
    existingInquiry = data
    if (existingInquiry) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id')
        .eq('inquiry_id', existingInquiry.id)
        .maybeSingle()
      conversationId = convo?.id ?? null
    }
  }

  // Check if consumer already paid for this listing
  let hasPaid = false
  if (authUser && !isOwner) {
    const { data: paidTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', id)
      .eq('payer_id', authUser.id)
      .eq('status', 'succeeded')
      .maybeSingle()
    hasPaid = !!paidTx
  }

  const sortedImages = l.listing_images.sort((a, b) => a.display_order - b.display_order)
  const amenities = l.listing_amenities.map(a => a.amenity)

  const initials = l.users?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <ListingGallery images={sortedImages} title={l.title} />

          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge
                className={
                  l.type === 'sublet'
                    ? 'bg-blue-600 text-white border-0'
                    : 'bg-emerald-600 text-white border-0'
                }
              >
                {l.type === 'sublet' ? 'Sublet' : (
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3" /> Housing Swap
                  </span>
                )}
              </Badge>
              {l.furnished && <Badge variant="outline">Furnished</Badge>}
              {l.utilities_included && <Badge variant="outline">Utilities included</Badge>}
              {l.pets_allowed && <Badge variant="outline">Pets OK</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{l.title}</h1>
            {l.neighborhood && (
              <p className="text-gray-500 mt-1">{l.neighborhood}, {l.city}, {l.state}</p>
            )}
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: BedDouble, label: 'Bedrooms', value: l.bedrooms === 0 ? 'Studio' : l.bedrooms ? `${l.bedrooms} bed` : '—' },
              { icon: Bath, label: 'Bathrooms', value: l.bathrooms ? `${l.bathrooms} bath` : '—' },
              { icon: Maximize2, label: 'Size', value: l.sq_ft ? `${l.sq_ft} sq ft` : '—' },
              { icon: Calendar, label: 'Available', value: formatDateRange(l.available_from, l.available_to) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <Icon className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-medium text-gray-900 text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Description */}
          {l.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About this place</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map(amenity => (
                  <div key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Swap preferences */}
          {l.type === 'swap' && l.swap_preferences && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Swap preferences</h2>
              <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                {l.swap_preferences.preferred_cities?.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Looking to swap with:</span>{' '}
                    {l.swap_preferences.preferred_cities.join(', ')}
                  </p>
                )}
                {l.swap_preferences.preferred_from && l.swap_preferences.preferred_to && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Preferred dates:</span>{' '}
                    {format(parseISO(l.swap_preferences.preferred_from), 'MMM d')} –{' '}
                    {format(parseISO(l.swap_preferences.preferred_to), 'MMM d, yyyy')}
                  </p>
                )}
                {l.swap_preferences.notes && (
                  <p className="text-sm text-gray-700">{l.swap_preferences.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          {l.lat && l.lng && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
              <ListingMap lat={l.lat} lng={l.lng} neighborhood={l.neighborhood} />
            </div>
          )}

          {/* Supplier profile */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Listed by</h2>
            <Link
              href={`/users/${l.users.id}`}
              className="group flex items-start gap-4 -mx-2 px-2 py-2 rounded-xl hover:bg-ink-soft/5 transition"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={l.users?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:underline">{l.users?.full_name}</p>
                <div className="flex items-center gap-3 text-sm mt-0.5">
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    U of M verified
                  </span>
                  {supplierRatingAvg !== null && (
                    <span className="inline-flex items-center gap-1 text-ink">
                      <Star className="w-3.5 h-3.5 fill-maize stroke-maize" />
                      <span className="font-medium">{supplierRatingAvg.toFixed(1)}</span>
                      <span className="text-ink-muted">({supplierReviewCount})</span>
                    </span>
                  )}
                </div>
                {l.users.bio && (
                  <p className="text-sm text-ink-soft mt-2 line-clamp-2">{l.users.bio}</p>
                )}
                <p className="text-xs text-primary mt-1">View full profile →</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Right: booking sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
              {(l.status === 'rented' || l.status === 'swapped') ? (
                <>
                  <div className="bg-[oklch(0.97_0.04_25)] border border-[oklch(0.85_0.1_25)] rounded-xl p-4 text-center">
                    <p className="font-display text-lg text-ink">
                      {l.status === 'rented' ? 'This place has been rented' : 'This swap is complete'}
                    </p>
                    <p className="text-sm text-ink-muted mt-1">
                      This listing is no longer available.
                    </p>
                  </div>
                  {existingInquiry?.status === 'accepted' && conversationId && (
                    <Link href={`/messages/${conversationId}`} className="block">
                      <Button className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11">
                        Open chat
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {l.type === 'sublet' && l.price_per_month && (
                    <div>
                      <p className="text-3xl font-bold text-ink">
                        {formatCents(l.price_per_month)}
                        <span className="text-base font-normal text-ink-muted">/mo</span>
                      </p>
                      {l.deposit_amount && (
                        <p className="text-sm text-ink-muted mt-1">
                          + {formatCents(l.deposit_amount)} deposit
                        </p>
                      )}
                    </div>
                  )}

                  {l.type === 'swap' && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="font-semibold text-emerald-800 flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4" />
                        Housing swap
                      </p>
                      <p className="text-sm text-emerald-700 mt-1">
                        No money changes hands — you swap your place for theirs.
                      </p>
                    </div>
                  )}

                  <div className="text-sm text-ink-soft bg-navy-soft/40 rounded-xl p-3">
                    <Calendar className="w-4 h-4 inline mr-1.5 text-navy" />
                    {format(parseISO(l.available_from), 'MMM d')} –{' '}
                    {format(parseISO(l.available_to), 'MMM d, yyyy')}
                  </div>

                  <InquiryForm
                    listing={l}
                    authUser={authUser ? { id: authUser.id } : null}
                    isOwner={isOwner}
                    existingInquiry={existingInquiry}
                    conversationId={conversationId}
                    hasPaid={hasPaid}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
