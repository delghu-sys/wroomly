import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashClaimToken, isClaimTokenExpired } from '@/lib/listing-import/claim-token'
import { signImportUrls } from '@/lib/listing-import/uploads'
import { isAllowedSupplierEmail } from '@/lib/listing-import/allowed-emails'
import { isPublishablePhotoPath } from '@/lib/listing-import/schema'
import { ClaimReview } from '@/components/import/ClaimReview'
import type { ExtractedListingDraft } from '@/types/listing-import'
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Review your draft listing',
  robots: { index: false, follow: false }, // private, tokenized
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">{children}</div>
  )
}

function ErrorState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <Shell>
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-[oklch(0.97_0.04_25)] text-[oklch(0.55_0.18_25)] items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="font-display text-2xl tracking-tight text-ink">{title}</h1>
        <p className="text-ink-muted mt-2 leading-relaxed">{body}</p>
        {cta && <div className="mt-6">{cta}</div>}
      </div>
    </Shell>
  )
}

export default async function ClaimListingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const service = createServiceClient()

  const { data: req } = await service
    .from('listing_import_requests')
    .select(
      'id, status, claim_token_expires_at, claimed_by_user_id, listing_id, extracted_data, personal_image_paths, building_image_paths, building_source_url, building_pasted_text, building_name, floor_plan_name',
    )
    .eq('claim_token_hash', hashClaimToken(token))
    .maybeSingle()

  if (!req || req.status !== 'completed' || !req.extracted_data) {
    return (
      <ErrorState
        title="This link isn’t valid"
        body="It may be mistyped or the draft may have been removed. Try importing your post again."
        cta={<Link href="/import-listing" className="text-navy hover:text-ink inline-flex items-center gap-1">Import a listing <ArrowRight className="w-4 h-4" /></Link>}
      />
    )
  }

  if (req.listing_id) {
    return (
      <ErrorState
        title="Already published"
        body="This draft has already been published as a live listing."
        cta={<Link href={`/listings/${req.listing_id}`} className="text-navy hover:text-ink inline-flex items-center gap-1">View the listing <ArrowRight className="w-4 h-4" /></Link>}
      />
    )
  }

  if (isClaimTokenExpired(req.claim_token_expires_at)) {
    return (
      <ErrorState
        title="This link has expired"
        body="Claim links are valid for 7 days. Import your post again to get a fresh link."
        cta={<Link href="/import-listing" className="text-navy hover:text-ink inline-flex items-center gap-1">Import again <ArrowRight className="w-4 h-4" /></Link>}
      />
    )
  }

  const draft = req.extracted_data as ExtractedListingDraft
  const {
    data: { user },
  } = await createClient().then(c => c.auth.getUser())

  // Claimed by someone else.
  if (user && req.claimed_by_user_id && req.claimed_by_user_id !== user.id) {
    return (
      <ErrorState
        title="Already claimed"
        body="This draft has been claimed by another account."
      />
    )
  }

  // Not signed in → preview + auth prompt.
  if (!user) {
    const next = encodeURIComponent(`/claim-listing/${token}`)
    return (
      <Shell>
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Your Wroomly draft
        </p>
        <h1 className="font-display text-3xl tracking-tight text-ink leading-tight">
          {draft.title ?? 'Your sublet draft'}
        </h1>
        <div className="mt-4 rounded-3xl border border-line bg-surface p-6 space-y-2 text-[14px] text-ink-soft">
          {draft.rentMonthly != null && <p><strong className="text-ink">${draft.rentMonthly.toLocaleString()}/mo</strong></p>}
          {draft.neighborhood && <p>{draft.neighborhood}, Ann Arbor</p>}
          {(draft.availableFrom || draft.availableTo) && (
            <p>{draft.availableFrom ?? '?'} → {draft.availableTo ?? '?'}</p>
          )}
          {draft.description && <p className="text-ink-muted line-clamp-4 pt-2">{draft.description}</p>}
        </div>
        <div className="mt-6 rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3 text-[13px] text-[oklch(0.45_0.14_75)]">
          Sign in or create your account to review every detail and publish. Nothing goes live until you confirm.
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link href={`/sign-up?next=${next}`} className="flex-1 inline-flex items-center justify-center h-12 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold text-sm hover:bg-[oklch(0.22_0.075_256)]/90 transition">
            Create account & claim
          </Link>
          <Link href={`/sign-in?next=${next}`} className="flex-1 inline-flex items-center justify-center h-12 rounded-full border border-line text-ink font-medium text-sm hover:border-[oklch(0.84_0.17_85/0.5)] transition">
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }

  // Signed in + (unclaimed or own) → editable review.
  // PDFs are AI source material, not publishable listing photos — exclude them
  // from the photo picker so they don't render as broken thumbnails.
  // Source files live in the PRIVATE imports bucket, so render them through
  // short-lived signed URLs rather than public URLs.
  const personalPaths = (req.personal_image_paths ?? []).filter(isPublishablePhotoPath)
  const buildingPaths = (req.building_image_paths ?? []).filter(isPublishablePhotoPath)
  const signed = await signImportUrls([...personalPaths, ...buildingPaths])
  const personalPhotos = personalPaths.map((path: string) => ({ path, url: signed[path] ?? '' }))
  const buildingPhotos = buildingPaths.map((path: string) => ({ path, url: signed[path] ?? '' }))
  const enrichmentUsed =
    !!req.building_source_url ||
    !!req.building_pasted_text ||
    !!req.building_name ||
    !!req.floor_plan_name ||
    (req.building_image_paths?.length ?? 0) > 0

  return (
    <Shell>
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
        <Sparkles className="w-3.5 h-3.5" /> Review your draft
      </p>
      <h1 className="font-display text-3xl tracking-tight text-ink leading-tight mb-6">
        Almost there — review & publish
      </h1>
      <ClaimReview
        token={token}
        draft={draft}
        personalPhotos={personalPhotos}
        buildingPhotos={buildingPhotos}
        enrichmentUsed={enrichmentUsed}
        canPublish={isAllowedSupplierEmail(user.email)}
      />
    </Shell>
  )
}
