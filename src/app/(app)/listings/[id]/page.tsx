import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { BrandedGallery } from '@/components/listings/BrandedGallery'
import { ListingMap } from '@/components/listings/ListingMap'
import { AmenityGrid } from '@/components/listings/AmenityGrid'
import { SupplierCard } from '@/components/listings/SupplierCard'
import { BookingSidebar } from '@/components/listings/BookingSidebar'
import { BrandChip } from '@/components/brand/BrandChip'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { BedDouble, Bath, Maximize2, Calendar, ArrowLeftRight, MapPin } from 'lucide-react'
import { formatDateRange } from '@/lib/utils/listing'
import { format, parseISO } from 'date-fns'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select('title, bedrooms, neighborhood, available_from, available_to')
    .eq('id', id)
    .single()

  if (!data) {
    return {
      title: 'Listing not found',
      description: 'This listing may have been removed or never existed.',
    }
  }

  const bedroomLabel =
    data.bedrooms === 0
      ? 'Studio'
      : data.bedrooms === 1
        ? '1 bedroom'
        : data.bedrooms
          ? `${data.bedrooms}-bedroom`
          : 'Room'

  const dateRange =
    data.available_from && data.available_to
      ? `${new Date(data.available_from).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} – ${new Date(data.available_to).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      : 'flexible dates'

  const description = `${bedroomLabel}${
    data.neighborhood ? ` in ${data.neighborhood}` : ''
  } — available ${dateRange}. Listed by a verified U of M student.`

  return {
    title: data.title,
    description,
    openGraph: {
      title: `${data.title} | Wroomly`,
      description,
      images: ['/og-default.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.title} | Wroomly`,
      description,
      images: ['/og-default.png'],
    },
  }
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
    users: {
      id: string
      full_name: string | null
      avatar_url: string | null
      university: string | null
      created_at: string
      bio: string | null
    }
  }

  // Fan-out the independent queries: supplier rating + auth lookup don't
  // depend on each other, so run them in parallel. Saves one round-trip.
  const [{ data: supplierReviews }, { data: { user: authUser } }] =
    await Promise.all([
      supabase.from('reviews').select('rating').eq('reviewee_id', l.supplier_id),
      supabase.auth.getUser(),
    ])

  const supplierReviewCount = supplierReviews?.length ?? 0
  const supplierRatingAvg =
    supplierReviewCount > 0
      ? (supplierReviews as { rating: number }[]).reduce((a, r) => a + r.rating, 0) /
        supplierReviewCount
      : null

  const isOwner = authUser?.id === l.supplier_id

  // Existing inquiry & conversation + paid status can fan out together for
  // authenticated non-owners.
  let existingInquiry: { id: string; status: string } | null = null
  let conversationId: string | null = null
  let hasPaid = false
  if (authUser && !isOwner) {
    const [inquiryRes, paidRes] = await Promise.all([
      supabase
        .from('inquiries')
        .select('id, status')
        .eq('listing_id', id)
        .eq('consumer_id', authUser.id)
        .single(),
      supabase
        .from('transactions')
        .select('id')
        .eq('listing_id', id)
        .eq('payer_id', authUser.id)
        .eq('status', 'succeeded')
        .maybeSingle(),
    ])

    existingInquiry = inquiryRes.data
    hasPaid = !!paidRes.data

    // Only fetch the conversation id if an inquiry actually exists.
    if (existingInquiry) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id')
        .eq('inquiry_id', existingInquiry.id)
        .maybeSingle()
      conversationId = convo?.id ?? null
    }
  }

  const sortedImages = l.listing_images.sort((a, b) => a.display_order - b.display_order)
  const amenities = l.listing_amenities.map(a => a.amenity)

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Hero gallery */}
            <ScrollReveal>
              <BrandedGallery images={sortedImages} title={l.title} />
            </ScrollReveal>

            {/* Title + badges */}
            <ScrollReveal delay={0.1}>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {l.type === 'sublet' ? (
                    <BrandChip variant="navy">Sublet</BrandChip>
                  ) : (
                    <BrandChip variant="primary" icon={ArrowLeftRight}>
                      Housing Swap
                    </BrandChip>
                  )}
                  {l.furnished && <BrandChip variant="ghost">Furnished</BrandChip>}
                  {l.utilities_included && (
                    <BrandChip variant="ghost">Utilities included</BrandChip>
                  )}
                  {l.pets_allowed && <BrandChip variant="ghost">Pets OK</BrandChip>}
                </div>

                <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] tracking-tight text-ink leading-[1.05]">
                  {l.title}
                </h1>
                {l.neighborhood && (
                  <p className="mt-3 text-ink-muted flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[oklch(0.45_0.13_85)]" strokeWidth={1.75} />
                    {l.neighborhood}, {l.city}, {l.state}
                  </p>
                )}
              </div>
            </ScrollReveal>

            {/* Key details — 4 stat tiles */}
            <ScrollReveal delay={0.15}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    icon: BedDouble,
                    label: 'Bedrooms',
                    value:
                      l.bedrooms === 0
                        ? 'Studio'
                        : l.bedrooms
                          ? `${l.bedrooms} bed`
                          : '—',
                  },
                  {
                    icon: Bath,
                    label: 'Bathrooms',
                    value: l.bathrooms ? `${l.bathrooms} bath` : '—',
                  },
                  {
                    icon: Maximize2,
                    label: 'Size',
                    value: l.sq_ft ? `${l.sq_ft} sq ft` : '—',
                  },
                  {
                    icon: Calendar,
                    label: 'Available',
                    value: formatDateRange(l.available_from, l.available_to),
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl p-4 border border-line bg-white"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[oklch(0.84_0.17_85/0.12)] text-[oklch(0.45_0.13_85)] flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted font-semibold">
                      {label}
                    </p>
                    <p className="font-display text-base text-ink mt-0.5 tracking-tight">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Description */}
            {l.description && (
              <ScrollReveal>
                <div>
                  <h2 className="font-display text-[1.75rem] tracking-tight text-ink mb-4 leading-tight">
                    About this place
                  </h2>
                  <p className="text-ink-soft leading-relaxed whitespace-pre-line max-w-[65ch]">
                    {l.description}
                  </p>
                </div>
              </ScrollReveal>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <ScrollReveal>
                <div>
                  <h2 className="font-display text-[1.75rem] tracking-tight text-ink mb-5 leading-tight">
                    Amenities
                  </h2>
                  <AmenityGrid amenities={amenities} />
                </div>
              </ScrollReveal>
            )}

            {/* Swap preferences */}
            {l.type === 'swap' && l.swap_preferences && (
              <ScrollReveal>
                <div>
                  <h2 className="font-display text-[1.75rem] tracking-tight text-ink mb-4 leading-tight">
                    Swap preferences
                  </h2>
                  <div className="rounded-3xl p-5 border border-[oklch(0.84_0.17_85/0.30)] bg-[oklch(0.84_0.17_85/0.06)] space-y-2">
                    {l.swap_preferences.preferred_cities?.length > 0 && (
                      <p className="text-sm text-ink-soft">
                        <span className="font-medium text-ink">Looking to swap with:</span>{' '}
                        {l.swap_preferences.preferred_cities.join(', ')}
                      </p>
                    )}
                    {l.swap_preferences.preferred_from &&
                      l.swap_preferences.preferred_to && (
                        <p className="text-sm text-ink-soft">
                          <span className="font-medium text-ink">Preferred dates:</span>{' '}
                          {format(parseISO(l.swap_preferences.preferred_from), 'MMM d')} –{' '}
                          {format(parseISO(l.swap_preferences.preferred_to), 'MMM d, yyyy')}
                        </p>
                      )}
                    {l.swap_preferences.notes && (
                      <p className="text-sm text-ink-soft leading-relaxed">
                        {l.swap_preferences.notes}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Map */}
            {l.lat && l.lng && (
              <ScrollReveal>
                <div>
                  <h2 className="font-display text-[1.75rem] tracking-tight text-ink mb-4 leading-tight">
                    Location
                  </h2>
                  <ListingMap lat={l.lat} lng={l.lng} neighborhood={l.neighborhood} />
                </div>
              </ScrollReveal>
            )}

            {/* Supplier card */}
            <ScrollReveal>
              <div>
                <h2 className="font-display text-[1.75rem] tracking-tight text-ink mb-4 leading-tight">
                  Listed by
                </h2>
                <SupplierCard
                  user={l.users}
                  ratingAvg={supplierRatingAvg}
                  reviewCount={supplierReviewCount}
                />
              </div>
            </ScrollReveal>
          </div>

          {/* Right: booking sidebar */}
          <div className="lg:col-span-1">
            <BookingSidebar
              listing={l}
              authUser={authUser ? { id: authUser.id } : null}
              isOwner={isOwner}
              existingInquiry={existingInquiry}
              conversationId={conversationId}
              hasPaid={hasPaid}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
