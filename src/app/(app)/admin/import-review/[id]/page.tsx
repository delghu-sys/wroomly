import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getListingImageUrl } from '@/lib/utils/listing'
import { AdminImportReview } from '@/components/admin/AdminImportReview'
import type { ExtractedListingDraft } from '@/types/listing-import'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Review AI import',
  robots: { index: false, follow: false },
}

export default async function AdminImportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const service = createServiceClient()
  const { data: me } = await service
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const { data: req } = await service
    .from('listing_import_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!req) notFound()

  const draft = req.extracted_data as ExtractedListingDraft | null
  const personalImages = (req.personal_image_paths ?? []).map((p: string) => getListingImageUrl(p))
  const buildingImages = (req.building_image_paths ?? []).map((p: string) => getListingImageUrl(p))

  const handled = req.status !== 'awaiting_admin_review'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/admin/import-review" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft className="w-4 h-4" /> All pending imports
      </Link>

      <h1 className="font-display text-3xl tracking-tight text-ink mb-1">Review AI import</h1>
      <p className="text-ink-muted mb-2">
        From <strong className="text-ink">{req.email}</strong>
      </p>
      {handled && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-soft mb-6">
          This import is no longer awaiting review (status: <strong>{req.status}</strong>). Actions are disabled.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* What the person submitted */}
        <div className="space-y-5">
          <h2 className="font-display text-xl tracking-tight text-ink">What they submitted</h2>

          <Field label="Pasted text">
            {req.personal_pasted_text ? (
              <p className="whitespace-pre-wrap text-[14px] text-ink-soft">{req.personal_pasted_text}</p>
            ) : <Empty>No text — photos only</Empty>}
          </Field>

          {req.personal_source_url && (
            <Field label="Existing post link">
              <a href={req.personal_source_url} target="_blank" rel="noopener noreferrer" className="text-navy underline break-all text-[13px]">{req.personal_source_url}</a>
            </Field>
          )}

          <Field label={`Photos & screenshots (${personalImages.length})`}>
            {personalImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {personalImages.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border border-line">
                    <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                  </a>
                ))}
              </div>
            ) : <Empty>None</Empty>}
          </Field>

          {(req.building_name || req.floor_plan_name || req.building_source_url || req.building_pasted_text || buildingImages.length > 0) && (
            <Field label="Building / floor-plan enrichment">
              <div className="space-y-1.5 text-[13px] text-ink-soft">
                {req.building_name && <p>Building: <strong className="text-ink">{req.building_name}</strong></p>}
                {req.floor_plan_name && <p>Floor plan: <strong className="text-ink">{req.floor_plan_name}</strong></p>}
                {req.building_source_url && <a href={req.building_source_url} target="_blank" rel="noopener noreferrer" className="text-navy underline break-all">{req.building_source_url}</a>}
                {req.building_pasted_text && <p className="whitespace-pre-wrap">{req.building_pasted_text}</p>}
                {buildingImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {buildingImages.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border border-line">
                        <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          )}
        </div>

        {/* What the AI created — editable */}
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          {draft && !handled ? (
            <AdminImportReview id={req.id} draft={draft} submitterEmail={req.email} />
          ) : draft ? (
            <p className="text-ink-muted text-sm">Draft (read-only): {draft.title ?? 'Untitled'}</p>
          ) : (
            <p className="text-ink-muted text-sm">No AI draft was produced.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-semibold mb-2">{label}</p>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-ink-muted italic">{children}</p>
}
