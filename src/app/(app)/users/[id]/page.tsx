import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type {
  User,
  UserPhoto,
  Review,
  ListingWithDetails,
} from '@/types/database'
import { Star, House, Notepad } from '@phosphor-icons/react/dist/ssr'
import { ProfileHero } from '@/components/users/ProfileHero'
import { SocialPill } from '@/components/users/SocialPill'
import { ProfileEmpty } from '@/components/users/ProfileEmpty'
import { UserListingsStrip } from '@/components/users/UserListingsStrip'
import { ReviewList } from '@/components/users/ReviewList'
import { ScrollReveal } from '@/components/home/ScrollReveal'

// User profile photos live in the same listing-images bucket under a
// `profile-photos/<user_id>/…` prefix, so the URL helper is shared with
// listings. See ProfileForm for the upload path convention.
import { getListingImageUrl as photoUrl } from '@/lib/utils/listing'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', id)
    .single()

  const name = data?.full_name ?? 'Profile'
  const description = 'Verified U of M student on Wroomly.'

  return {
    title: name,
    description,
    openGraph: {
      title: `${name} | Wroomly`,
      description,
      images: ['/og-default.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Wroomly`,
      description,
      images: ['/og-default.png'],
    },
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!user) notFound()
  const u = user as User

  const [photosRes, reviewsRes, listingsRes] = await Promise.all([
    supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', id)
      .order('display_order', { ascending: true }),
    supabase
      .from('reviews')
      .select(
        '*, reviewer:users!reviews_reviewer_id_fkey(id, full_name, avatar_url)'
      )
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('listings')
      .select(`
        *,
        listing_images(*),
        listing_amenities(*),
        swap_preferences(*),
        users:supplier_id(id, full_name, avatar_url, university)
      `)
      .eq('supplier_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const photos = (photosRes.data ?? []) as UserPhoto[]
  const reviews = (reviewsRes.data ?? []) as (Review & {
    reviewer: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  })[]
  const listings = (listingsRes.data ?? []) as ListingWithDetails[]

  const ratingCount = reviews.length
  const ratingAvg =
    ratingCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount
      : null

  const initials =
    u.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?'

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-[oklch(0.985_0.006_85)] overflow-hidden">
      {/* Very subtle ambient mesh */}
      <div
        className="pointer-events-none absolute -top-32 right-[-10%] w-[640px] h-[640px] rounded-full blur-[140px] opacity-25"
        style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-20 w-[520px] h-[520px] rounded-full blur-[140px] opacity-15"
        style={{ background: 'oklch(0.45 0.10 280 / 0.30)' }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-8 lg:gap-12">
          {/* ── Left column — profile info ── */}
          <div className="space-y-5">
            <ProfileHero
              fullName={u.full_name}
              avatarUrl={u.avatar_url}
              initials={initials}
              university={u.university}
              createdAt={u.created_at}
              isVerified={u.is_verified}
              isAdmin={u.user_type === 'admin'}
              userType={u.user_type}
              ratingAvg={ratingAvg}
              ratingCount={ratingCount}
            />

            {/* Social */}
            {u.instagram_handle && (
              <ScrollReveal>
                <div className="px-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-2.5">
                    Find them
                  </p>
                  <SocialPill network="instagram" handle={u.instagram_handle} />
                </div>
              </ScrollReveal>
            )}

            {/* About */}
            <ScrollReveal>
              <div className="px-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-2.5">
                  About
                </p>
                {u.bio ? (
                  <p className="text-[14.5px] text-ink-soft leading-relaxed whitespace-pre-line max-w-prose">
                    {u.bio}
                  </p>
                ) : (
                  <ProfileEmpty
                    icon={<Notepad size={36} weight="duotone" />}
                    title="No bio yet."
                    accent="Just vibes."
                    body="This student hasn't written a bio. You can still message them about a listing — Wroomly keeps replies and reputation public."
                  />
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* ── Right column — listings + reviews ── */}
          <div className="space-y-12">
            {/* Listings */}
            <ScrollReveal>
              <section>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink leading-[1.05]">
                    Active{' '}
                    <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                      listings
                    </span>
                  </h2>
                  {listings.length > 0 && (
                    <span className="text-[12px] text-ink-muted tabular-nums shrink-0">
                      {listings.length} {listings.length === 1 ? 'place' : 'places'}
                    </span>
                  )}
                </div>

                {listings.length > 0 ? (
                  <UserListingsStrip listings={listings} />
                ) : (
                  <ProfileEmpty
                    icon={<House size={36} weight="duotone" />}
                    title="No active listings"
                    accent="right now."
                    body={
                      u.user_type === 'supplier'
                        ? 'This supplier hasn’t posted a place yet, or their listings are paused. Check back next semester.'
                        : 'This student is browsing, not listing. Their reviews and reputation appear below.'
                    }
                  />
                )}
              </section>
            </ScrollReveal>

            {/* Photos — keep if present, in a tight grid */}
            {photos.length > 0 && (
              <ScrollReveal>
                <section>
                  <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink leading-[1.05] mb-5">
                    Photos
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {photos.slice(0, 6).map(photo => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-2xl overflow-hidden bg-[oklch(0.95_0.01_85)] border border-line"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl(photo.storage_path)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            )}

            {/* Reviews */}
            <ScrollReveal>
              <section>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink leading-[1.05]">
                    Reviews
                  </h2>
                  {ratingCount > 0 && (
                    <span className="text-[12px] text-ink-muted tabular-nums shrink-0">
                      {ratingCount}{' '}
                      {ratingCount === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </div>

                {reviews.length > 0 ? (
                  <ReviewList reviews={reviews} />
                ) : (
                  <ProfileEmpty
                    icon={<Star size={36} weight="duotone" />}
                    title="Reviews appear here"
                    accent="after a stay."
                    body="Once a booking wraps up, both sides leave a public review. Reputation makes the next match easier for everyone."
                  />
                )}
              </section>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  )
}
