import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { User, UserPhoto, Review } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AtSign, ShieldCheck, Star, GraduationCap, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const photoUrl = (path: string) =>
  `${SUPA_URL}/storage/v1/object/public/listing-images/${path}`

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
  return { title: data?.full_name ?? 'Profile' }
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

  const [photosRes, reviewsRes] = await Promise.all([
    supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', id)
      .order('display_order', { ascending: true }),
    supabase
      .from('reviews')
      .select('*, reviewer:users!reviews_reviewer_id_fkey(id, full_name, avatar_url)')
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const photos = (photosRes.data ?? []) as UserPhoto[]
  const reviews = (reviewsRes.data ?? []) as (Review & {
    reviewer: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  })[]

  const ratingCount = reviews.length
  const ratingAvg =
    ratingCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount
      : null

  const initials = u.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const memberSince = format(parseISO(u.created_at), 'MMM yyyy')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <Avatar className="h-28 w-28 ring-2 ring-line">
          <AvatarImage src={u.avatar_url ?? undefined} />
          <AvatarFallback className="bg-navy-soft text-navy text-3xl font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="capitalize">
              {u.user_type}
            </Badge>
            {u.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <ShieldCheck className="w-3.5 h-3.5" /> U of M verified
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl tracking-tight text-ink">
            {u.full_name ?? 'Anonymous'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
            {u.university && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                {u.university}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              On Wroomly since {memberSince}
            </span>
            {ratingAvg !== null && (
              <span className="inline-flex items-center gap-1.5 text-ink">
                <Star className="w-4 h-4 fill-maize stroke-maize" />
                <span className="font-medium">{ratingAvg.toFixed(1)}</span>
                <span className="text-ink-muted">
                  ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                </span>
              </span>
            )}
          </div>
          {u.instagram_handle && (
            <a
              href={`https://instagram.com/${u.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
            >
              <AtSign className="w-4 h-4" />
              {u.instagram_handle} on Instagram
            </a>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Bio */}
      {u.bio && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-ink mb-3">About</h2>
          <p className="text-ink-soft leading-relaxed whitespace-pre-line">{u.bio}</p>
        </section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-ink mb-3">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="aspect-square rounded-2xl overflow-hidden bg-ink-soft/10 border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(photo.storage_path)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 className="font-display text-xl text-ink mb-4">
          Reviews {ratingCount > 0 && <span className="text-ink-muted">({ratingCount})</span>}
        </h2>

        {ratingCount === 0 ? (
          <p className="text-ink-muted text-sm">No reviews yet.</p>
        ) : (
          <ul className="space-y-6">
            {reviews.map(r => {
              const rInitials = r.reviewer?.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              return (
                <li key={r.id} className="flex gap-4">
                  <Link href={`/users/${r.reviewer.id}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.reviewer?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-soft text-navy text-xs">
                        {rInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${r.reviewer.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {r.reviewer?.full_name ?? 'Anonymous'}
                      </Link>
                      <span className="text-xs text-ink-muted">
                        {format(parseISO(r.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${
                            n <= r.rating
                              ? 'fill-maize stroke-maize'
                              : 'stroke-ink-muted/40'
                          }`}
                        />
                      ))}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-ink-soft mt-2 leading-relaxed whitespace-pre-line">
                        {r.comment}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
