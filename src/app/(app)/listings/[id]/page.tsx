import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ListingWithDetails } from '@/types/database'
import { BrandedGallery } from '@/components/listings/BrandedGallery'
import { ListingMap } from '@/components/listings/ListingMap'
import { AmenityGrid } from '@/components/listings/AmenityGrid'
import { SupplierCard } from '@/components/listings/SupplierCard'
import { BookingSidebar } from '@/components/listings/BookingSidebar'
import { BrandChip } from '@/components/brand/BrandChip'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { ShareListing } from '@/components/listings/ShareListing'
import { ViewPing } from '@/components/listings/ViewPing'
import { BedDouble, Bath, Maximize2, Calendar, MapPin, Eye, Heart } from 'lucide-react'
import { formatDateRange, getListingImageUrl } from '@/lib/utils/listing'
import { format, parseISO } from 'date-fns'
import {
  JsonLd,
  listingJsonLd,
  breadcrumbJsonLd,
} from '@/components/seo/JsonLd'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(
      'title, type, bedrooms, neighborhood, price_per_month, available_from, available_to',
    )
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
        ? '1-bedroom'
        : data.bedrooms
          ? `${data.bedrooms}-bedroom`
          : 'Room'

  const typeLabel = 'sublet'
  const where = data.neighborhood ? `${data.neighborhood}, Ann Arbor` : 'Ann Arbor'
  const priceLabel = data.price_per_month
    ? ` — $${Math.round(data.price_per_month / 100).toLocaleString()}/mo`
    : ''

  // SEO: keyword-led, unique per listing — "{bedrooms} {type} near
  // {neighborhood}, Ann Arbor — $price/mo". Real fields, never hardcoded.
  const seoTitle = `${bedroomLabel} ${typeLabel} near ${where}${priceLabel}`

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

  const description = `${bedroomLabel} ${typeLabel} in ${where}, available ${dateRange}. Listed by a verified University of Michigan student on Wroomly — @umich.edu-verified, no scams.`

  return {
    title: seoTitle,
    description,
    alternates: {
      canonical: `/listings/${id}`,
    },
    openGraph: {
      title: `${seoTitle} | Wroomly`,
      description,
      type: 'website',
      images: ['/og-default.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seoTitle} | Wroomly`,
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

  // Fetch the listing regardless of status. We do the visibility check
  // below, after we know whether the viewer is the owner or the consumer
  // who paid — both of whom can see the page even if the listing has
  // been moved out of public visibility (archived after rent, etc.).
  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, avatar_url, university, created_at, bio, instagram_handle)
    `)
    .eq('id', id)
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
      instagram_handle: string | null
    }
  }

  // Fan-out the independent queries: supplier rating + auth lookup don't
  // depend on each other, so run them in parallel. Saves one round-trip.
  // Activity cues (docs/social-share-audit.md item 3) ride along: real save
  // count from favorites and real view count from listing_viewed events —
  // both need the service role (favorites RLS is per-user; analytics_events
  // is service-only). Failure-tolerant: a missing table just yields null → 0.
  const service = createServiceClient()
  const [
    { data: supplierReviews },
    { data: { user: authUser } },
    { count: saveCountRaw },
    { count: viewCountRaw },
  ] = await Promise.all([
    supabase.from('reviews').select('rating').eq('reviewee_id', l.supplier_id),
    supabase.auth.getUser(),
    service.from('favorites').select('id', { count: 'exact', head: true }).eq('listing_id', id),
    service
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('name', 'listing_viewed')
      .eq('props->>listingId', id),
  ])
  const saveCount = saveCountRaw ?? 0
  const viewCount = viewCountRaw ?? 0

  const supplierReviewCount = supplierReviews?.length ?? 0
  const supplierRatingAvg =
    supplierReviewCount > 0
      ? (supplierReviews as { rating: number }[]).reduce((a, r) => a + r.rating, 0) /
        supplierReviewCount
      : null

  const isOwner = authUser?.id === l.supplier_id

  // Existing inquiry & conversation + paid status can fan out together for
  // authenticated non-owners. Note: we check `hasPaid` BEFORE the
  // visibility gate so a consumer who booked the place can still see it
  // after status moves to `archived` or any other non-public state.
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
        .maybeSingle(),
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

  // Visibility gate. Public statuses (active/rented/swapped) are visible
  // to anyone. Non-public statuses (archived/draft/pending_review) are
  // only visible to the owner — so they can manage their own listings —
  // or to the consumer who paid for it — so their "My applications" link
  // never 404s after the supplier archives the listing post-booking.
  const PUBLIC_STATUSES = ['active', 'rented', 'swapped']
  const isPubliclyVisible = PUBLIC_STATUSES.includes(l.status)
  if (!isPubliclyVisible && !isOwner && !hasPaid) {
    notFound()
  }

  const sortedImages = l.listing_images.sort((a, b) => a.display_order - b.display_order)
  const amenities = l.listing_amenities.map(a => a.amenity)

  // SEO: only emit Accommodation/Breadcrumb structured data for publicly
  // visible (active) listings. Don't mark up an archived/rented listing
  // that's only reachable because the viewer booked it — those shouldn't
  // surface as available inventory in search.
  const emitStructuredData = isPubliclyVisible

  return (
    <div className="bg-background">
      {emitStructuredData && (
        <JsonLd
          data={[
            listingJsonLd({
              id: l.id,
              title: l.title,
              description: l.description,
              pricePerMonthCents: l.price_per_month,
              bedrooms: l.bedrooms,
              bathrooms: l.bathrooms,
              neighborhood: l.neighborhood,
              city: l.city,
              state: l.state,
              availableFrom: l.available_from,
              availableTo: l.available_to,
              furnished: l.furnished,
              petsAllowed: l.pets_allowed,
              imageUrls: sortedImages.map(img => getListingImageUrl(img.storage_path)),
            }),
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Browse', path: '/listings' },
              { name: l.title, path: `/listings/${l.id}` },
            ]),
          ]}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* "Your reservation" banner — shown when the viewer has paid for
            this listing. Makes it immediately obvious they're looking at
            their own booking (which is why the page works even though the
            listing's status is no longer public). */}
        {hasPaid && (
          <div
            className="mb-6 rounded-2xl border px-5 py-4 flex items-center gap-3"
            style={{
              background: 'oklch(0.96 0.04 142)',
              borderColor: 'oklch(0.85 0.10 142)',
              color: 'oklch(0.35 0.13 142)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'oklch(0.55 0.15 142)' }}
            >
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-display text-base tracking-tight">
                Your reservation
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                You booked this place. It&apos;s hidden from the public browse
                but stays here for you in <strong>My applications</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Hero gallery — CSS entrance, NOT ScrollReveal: this is the
                page's LCP element, and a motion-gated entrance renders it
                invisible until the bundle hydrates (~7s on a slow phone). */}
            <div className="animate-fade-up">
              <BrandedGallery images={sortedImages} title={l.title} />
            </div>

            {/* Title + badges — same: above the fold, must not wait for JS. */}
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div>
                <ViewPing listingId={l.id} />
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <BrandChip variant="navy">Sublet</BrandChip>
                    {l.furnished && <BrandChip variant="ghost">Furnished</BrandChip>}
                    {l.utilities_included && (
                      <BrandChip variant="ghost">Utilities included</BrandChip>
                    )}
                    {l.pets_allowed && <BrandChip variant="ghost">Pets OK</BrandChip>}
                  </div>
                  <ShareListing
                    listingId={l.id}
                    title={l.title}
                    priceLabel={
                      l.price_per_month
                        ? `$${Math.round(l.price_per_month / 100).toLocaleString()}/mo`
                        : null
                    }
                  />
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
                {/* Honest activity cues — real counts only, hidden until they
                    reach 3 so a fresh listing never shows a sad zero and the
                    numbers are never fabricated (audit item 3). */}
                {(viewCount >= 3 || saveCount >= 3) && (
                  <p className="mt-2 flex items-center gap-4 text-[13px] text-ink-muted">
                    {viewCount >= 3 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {viewCount.toLocaleString()} student{viewCount === 1 ? '' : 's'} viewed
                      </span>
                    )}
                    {saveCount >= 3 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Saved by {saveCount.toLocaleString()}
                      </span>
                    )}
                  </p>
                )}
                {/* Source provenance (seed or partner) — honest attribution + link. */}
                {l.source !== 'user' && l.source_name && (
                  <p className="mt-2 text-[13px] text-ink-muted">
                    Listed on{' '}
                    {l.source_url ? (
                      <a
                        href={l.source_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-navy underline underline-offset-2 hover:text-ink"
                      >
                        {l.source_name}
                      </a>
                    ) : (
                      <span className="text-ink-soft">{l.source_name}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

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
                    // TODO(data): The `sq_ft` field is rendering values that
                    // look off for some listings (e.g. a Verve studio reports
                    // ~121 sq ft when Ann Arbor studios are typically
                    // 400–600 sq ft). Either the supplier entered the wrong
                    // figure or the unit drifted somewhere upstream. Audit
                    // the schema + wizard input before changing display.
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
