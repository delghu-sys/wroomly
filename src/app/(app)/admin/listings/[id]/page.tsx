import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, AlertCircle, CheckCircle2, ExternalLink, MapPin, Sparkles, XCircle } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AdminListingActions } from '@/components/admin/AdminListingActions'
import { Badge } from '@/components/ui/badge'
import { formatCents, formatDateRange, getListingImageUrl } from '@/lib/utils/listing'
import { walkToCampus } from '@/lib/campus'
import { isInServiceArea } from '@/lib/listing-import/publish-validation'
import type { Listing, ListingAmenity, ListingImage, SwapPreference, User } from '@/types/database'

export const metadata: Metadata = { title: 'Admin: Review listing', robots: { index: false, follow: false } }

type Supplier = Pick<User, 'id' | 'full_name' | 'email' | 'phone' | 'avatar_url' | 'university' | 'is_verified' | 'verification_method' | 'is_suspended' | 'created_at'>

type FullListing = Listing & {
  video_path: string | null
  listing_images: ListingImage[]
  listing_amenities: ListingAmenity[]
  swap_preferences: SwapPreference | SwapPreference[] | null
  users: Supplier | null
}

const STATUS_TONE: Record<string, string> = {
  pending_review: 'text-amber-600 border-amber-300',
  active: 'text-green-600 border-green-300',
  archived: 'text-ink-muted border-line',
}

const yesNo = (b: boolean | null | undefined) => (b === null || b === undefined ? 'Not given' : b ? 'Yes' : 'No')
const money = (c: number | null) => (c === null || c === undefined ? 'Not given' : formatCents(c))
const when = (iso: string | null) => (iso ? format(parseISO(iso), 'MMM d, yyyy h:mm a') : 'Not given')

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-3xl p-6 shadow-1">
      <h2 className="font-display text-lg tracking-tight text-ink mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold">{k}</dt>
          <dd className="mt-0.5 text-[15px] text-ink break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Everything a host submitted for one listing, for the admin deciding whether
 * to approve it. The public listing page only shows ACTIVE listings, so a
 * pending one looked like it did not exist; this page reads under the service
 * role, behind the same admin check as the rest of /admin.
 */
export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: me } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const service = createServiceClient()
  const { data } = await service
    .from('listings')
    .select(`
      *,
      listing_images(*),
      listing_amenities(*),
      swap_preferences(*),
      users:supplier_id(id, full_name, email, phone, avatar_url, university, is_verified, verification_method, is_suspended, created_at)
    `)
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()
  const l = data as unknown as FullListing

  const [imports, others] = await Promise.all([
    service
      .from('listing_import_requests')
      .select('id, status, created_at, reviewed_at, personal_source_url, building_source_url, building_name')
      .eq('listing_id', id),
    service
      .from('listings')
      .select('id, title, status')
      .eq('supplier_id', l.supplier_id)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const images = [...(l.listing_images ?? [])].sort((a, b) => a.display_order - b.display_order)
  const amenities = (l.listing_amenities ?? []).map(a => a.amenity)
  const swap = Array.isArray(l.swap_preferences) ? l.swap_preferences[0] ?? null : l.swap_preferences
  const walk = walkToCampus(l.lat, l.lng)
  const inArea = l.lat != null && l.lng != null ? isInServiceArea(l.lat, l.lng) : null
  const s = l.users
  const live = l.status === 'active'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      <Link href={`/admin/listings?status=${l.status}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to the queue
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight text-ink text-balance">{l.title}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Submitted {when(l.created_at)} · last changed {when(l.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={STATUS_TONE[l.status] ?? ''}>{l.status.replace('_', ' ')}</Badge>
          {live && (
            <Link href={`/listings/${l.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline underline-offset-4">
              View live <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
      {!live && (
        <p className="text-[13.5px] text-ink-soft rounded-2xl border border-line bg-navy-soft/40 px-4 py-3">
          This listing is not public yet, so the public page for it shows &ldquo;not found&rdquo;. Everything the host entered is below.
        </p>
      )}

      {l.status === 'pending_review' && (
        <Section title="Decision">
          <AdminListingActions listingId={l.id} />
        </Section>
      )}

      {l.auto_review_decision && (
        <div
          className={`flex items-start gap-2 text-sm rounded-2xl px-4 py-3 border ${
            l.auto_review_decision === 'approve' ? 'bg-green-50 border-green-200 text-green-800'
            : l.auto_review_decision === 'reject' ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {l.auto_review_decision === 'approve' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : l.auto_review_decision === 'reject' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <div className="font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI moderator: {l.auto_review_decision}{l.auto_reviewed_at ? ` · ${when(l.auto_reviewed_at)}` : ''}</div>
            {l.auto_review_reason && <p className="text-xs opacity-90 mt-0.5">{l.auto_review_reason}</p>}
            {l.auto_review_flags && l.auto_review_flags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {l.auto_review_flags.map(f => (
                  <span key={f} className="text-[10px] uppercase tracking-wide bg-white/60 rounded px-1.5 py-0.5">{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Section title={`Photos (${images.length})`}>
        {images.length === 0 ? (
          <p className="text-sm text-red-700">No photos were uploaded.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <li key={img.id}>
                <a href={getListingImageUrl(img.storage_path)} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getListingImageUrl(img.storage_path)} alt={`Photo ${i + 1} of ${images.length}`} className="w-full aspect-[4/3] object-cover rounded-2xl border border-line bg-navy-soft" loading="lazy" />
                </a>
                <p className="mt-1 text-[11px] text-ink-muted">{i === 0 ? 'Cover photo' : `Photo ${i + 1}`} · click for full size</p>
              </li>
            ))}
          </ul>
        )}
        {l.video_path && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Video walkthrough</p>
            <video src={getListingImageUrl(l.video_path)} controls preload="metadata" className="w-full max-w-xl rounded-2xl border border-line bg-black" />
          </div>
        )}
      </Section>

      <Section title="The place">
        <Facts
          rows={[
            ['Type', <span key="t" className="capitalize">{l.type}</span>],
            ['Property type', l.property_type ? <span key="p" className="capitalize">{l.property_type}</span> : 'Not given'],
            ['Building or residence', l.residence_name ?? 'Not given'],
            ['Bedrooms', l.bedrooms ?? 'Not given'],
            ['Bathrooms', l.bathrooms ?? 'Not given'],
            ['Size', l.sq_ft ? `${l.sq_ft.toLocaleString()} sq ft` : 'Not given'],
            ['Furnished', yesNo(l.furnished)],
            ['Pets allowed', yesNo(l.pets_allowed)],
            ['Utilities included', yesNo(l.utilities_included)],
          ]}
        />
      </Section>

      <Section title="Price and dates">
        <Facts
          rows={[
            ['Rent', l.price_per_month ? `${formatCents(l.price_per_month)} / month` : 'Not given'],
            ['Deposit', money(l.deposit_amount)],
            ['Available', formatDateRange(l.available_from, l.available_to)],
            ['From', l.available_from],
            ['To', l.available_to],
          ]}
        />
      </Section>

      <Section title="Location">
        <Facts
          rows={[
            ['Address', l.address ?? 'Not given'],
            ['Neighborhood', l.neighborhood ?? 'Not given'],
            ['City', `${l.city}, ${l.state}`],
            ['Walk to campus', walk ? walk.label : l.lat != null && l.lng != null ? 'Too far to walk' : 'No pin to measure from'],
            [
              'Map pin',
              l.lat != null && l.lng != null ? (
                <span key="m" className="inline-flex flex-wrap items-center gap-x-2">
                  <span className="tabular-nums">{l.lat.toFixed(5)}, {l.lng.toFixed(5)}</span>
                  <a href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-navy underline underline-offset-2">
                    <MapPin className="w-3.5 h-3.5" /> Open map
                  </a>
                </span>
              ) : 'No pin set',
            ],
            ['Inside the Ann Arbor area', inArea === null ? 'No pin' : inArea ? 'Yes' : 'No: check the pin'],
          ]}
        />
      </Section>

      <Section title="Description">
        {l.description ? (
          <p className="text-[15px] text-ink-soft leading-relaxed whitespace-pre-wrap">{l.description}</p>
        ) : (
          <p className="text-sm text-red-700">No description was written.</p>
        )}
      </Section>

      <Section title={`Amenities (${amenities.length})`}>
        {amenities.length === 0 ? (
          <p className="text-sm text-ink-muted">None selected.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {amenities.map(a => (
              <li key={a} className="rounded-full border border-line bg-background px-3 py-1 text-[13px] text-ink-soft">{a.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        )}
      </Section>

      {swap && (
        <Section title="Swap preferences">
          <Facts
            rows={[
              ['Preferred cities', swap.preferred_cities?.length ? swap.preferred_cities.join(', ') : 'Not given'],
              ['Preferred dates', swap.preferred_from || swap.preferred_to ? `${swap.preferred_from ?? '?'} to ${swap.preferred_to ?? '?'}` : 'Not given'],
              ['Notes', swap.notes ?? 'None'],
            ]}
          />
        </Section>
      )}

      <Section title="Host">
        <Facts
          rows={[
            ['Name', s?.full_name ?? 'Not given'],
            ['Email', s?.email ?? 'Not given'],
            ['Phone', s?.phone ?? 'Not given'],
            ['University', s?.university ?? 'Not given'],
            ['Blue check', s ? (s.is_verified ? `Yes (${s.verification_method ?? 'unknown method'})` : 'No') : 'Not given'],
            ['Suspended', s ? yesNo(s.is_suspended) : 'Not given'],
            ['Joined', s ? when(s.created_at) : 'Not given'],
          ]}
        />
        {(others.data ?? []).length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Their other listings</p>
            <ul className="space-y-1.5 text-sm">
              {(others.data as { id: string; title: string; status: string }[]).map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/listings/${o.id}`} className="text-navy underline underline-offset-2 truncate">{o.title}</Link>
                  <span className="text-xs text-ink-muted shrink-0">{o.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Where it came from">
        <Facts
          rows={[
            ['Source', l.source],
            ['Source name', l.source_name ?? 'None'],
            ['Source link', l.source_url ? <a key="u" href={l.source_url} target="_blank" rel="noreferrer" className="text-navy underline underline-offset-2">{l.source_url}</a> : 'None'],
            ['Enquiries forwarded to', l.inquiry_email ?? 'Messages stay on Wroomly'],
          ]}
        />
        {(imports.data ?? []).length > 0 && (
          <div className="mt-5 text-sm text-ink-soft">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">Created from an import</p>
            <ul className="space-y-1">
              {(imports.data as { id: string; status: string; created_at: string; personal_source_url: string | null; building_source_url: string | null }[]).map(r => (
                <li key={r.id}>
                  {r.status}, {when(r.created_at)}
                  {r.personal_source_url && <> · <a href={r.personal_source_url} target="_blank" rel="noreferrer" className="text-navy underline underline-offset-2">their post</a></>}
                  {r.building_source_url && <> · <a href={r.building_source_url} target="_blank" rel="noreferrer" className="text-navy underline underline-offset-2">building page</a></>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-muted">Listing id {l.id}</p>
      </Section>
    </div>
  )
}
