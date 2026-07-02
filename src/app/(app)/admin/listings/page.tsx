import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AdminListingActions } from '@/components/admin/AdminListingActions'
import { AdminAutoReviewSweep } from '@/components/admin/AdminAutoReviewSweep'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, parseISO } from 'date-fns'
import { formatCents } from '@/lib/utils/listing'
import Link from 'next/link'
import { ExternalLink, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { Listing, User } from '@/types/database'

export const metadata: Metadata = { title: 'Admin — Listings' }

type AdminListingRow = Listing & {
  listing_images: { id: string }[]
  users: Pick<User, 'id' | 'full_name' | 'avatar_url'> & { email: string } | null
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'pending_review' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if ((profileData as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  // The supplier join pulls email (for the admin review queue), unreadable by
  // authenticated after 029 — this admin-gated query runs under the service role.
  const { data: listingsData } = await createServiceClient()
    .from('listings')
    .select(`
      *,
      listing_images(id),
      users:supplier_id(id, full_name, avatar_url, email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  const listings = (listingsData ?? []) as AdminListingRow[]

  const TABS = [
    { label: 'Pending review', value: 'pending_review' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]

  const STATUS_COLORS: Record<string, string> = {
    pending_review: 'text-amber-600 border-amber-300',
    active: 'text-green-600 border-green-300',
    archived: 'text-gray-400 border-gray-300',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        {status === 'pending_review' && <AdminAutoReviewSweep />}
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={`/admin/listings?status=${tab.value}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-600">No listings in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map(listing => {
            const supplier = listing.users
            const initials = supplier?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

            return (
              <div key={listing.id} className="bg-white border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                      <Link href={`/listings/${listing.id}`} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="capitalize">{listing.type}</span>
                      <span>·</span>
                      <span>{listing.neighborhood}, {listing.city}</span>
                      {listing.price_per_month && (
                        <>
                          <span>·</span>
                          <span>{formatCents(listing.price_per_month)}/mo</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(parseISO(listing.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[listing.status] ?? ''}>
                    {listing.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={supplier?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">{supplier?.full_name}</span>
                    <span className="text-gray-400 ml-2">{(supplier as { email?: string } | null)?.email}</span>
                  </div>
                </div>

                {listing.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{listing.description}</p>
                )}

                {listing.auto_review_decision && (
                  <div
                    className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 mb-4 border ${
                      listing.auto_review_decision === 'approve'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : listing.auto_review_decision === 'reject'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {listing.auto_review_decision === 'approve' ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : listing.auto_review_decision === 'reject' ? (
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI moderator: {listing.auto_review_decision}
                      </div>
                      {listing.auto_review_reason && (
                        <p className="text-xs opacity-90 mt-0.5">{listing.auto_review_reason}</p>
                      )}
                      {listing.auto_review_flags && listing.auto_review_flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {listing.auto_review_flags.map(f => (
                            <span
                              key={f}
                              className="text-[10px] uppercase tracking-wide bg-white/60 rounded px-1.5 py-0.5"
                            >
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {listing.status === 'pending_review' && (
                  <AdminListingActions listingId={listing.id} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
