import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingWizard } from '@/components/listings/ListingWizard'
import { VerifyBadgeNudge } from '@/components/listings/VerifyBadgeNudge'
import { House, EnvelopeOpen, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import { MagneticLinkCta } from '@/components/brand/MagneticLinkCta'

export const metadata: Metadata = { title: 'List Your Place' }

export default async function NewListingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/listings/new')

  const { data: profile } = await supabase
    .from('users')
    .select('user_type, is_verified')
    .eq('id', user.id)
    .single()

  // Listing is open to everyone — verification is NOT required. Unverified
  // suppliers see an optional nudge (below the header) to verify and earn the
  // blue check on their listing; verified ones don't.
  const isVerified = (profile as { is_verified?: boolean } | null)?.is_verified === true

  // ── Non-supplier interstitial — explains why we can't continue and
  //    points them somewhere useful, instead of a silent redirect. ──
  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div
          className="relative rounded-3xl overflow-hidden border border-line bg-white/85 backdrop-blur-xl p-8 sm:p-10"
          style={{
            boxShadow: 'var(--shadow-edge), var(--shadow-3)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: 'color-mix(in oklab, var(--maize-bright) 30%, transparent)' }}
            aria-hidden
          />

          <div className="relative">
            <div
              className="inline-flex w-12 h-12 rounded-2xl items-center justify-center shadow-glow-maize"
              style={{
                background: 'var(--navy-deep)',
                color: 'var(--maize-bright)',
              }}
            >
              <House size={22} weight="duotone" />
            </div>

            <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] mt-6">
              Listing is{' '}
              <span className="italic font-light text-gold-deep">
                supplier-only.
              </span>
            </h1>

            <p className="mt-4 text-ink-soft leading-relaxed max-w-[55ch]">
              Only supplier accounts can post a place. Your account is
              registered as a consumer, so the listing wizard is unavailable.
            </p>

            <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-2xl bg-maize-bright/8 border border-maize-bright/25">
              <EnvelopeOpen
                size={18}
                weight="duotone"
                className="text-gold-deep mt-0.5 shrink-0"
              />
              <p className="text-[13.5px] text-ink-soft leading-relaxed">
                To become a supplier, sign up again with a{' '}
                <strong className="font-semibold text-[oklch(0.32_0.10_85)]">
                  different email address
                </strong>{' '}
                and pick &ldquo;I have a place&rdquo;.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md">
              <MagneticLinkCta
                href="/listings"
                variant="primary"
                icon={<MagnifyingGlass size={15} weight="bold" />}
              >
                Browse listings instead
              </MagneticLinkCta>
              <Link
                href="/dashboard"
                className="
                  inline-flex w-full items-center justify-center
                  h-11 px-5 rounded-full
                  bg-white border border-line text-ink-soft
                  text-[13.5px] font-medium
                  hover:border-maize-bright/40 hover:text-ink
                  transition-all duration-300 active:scale-[0.97]
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-maize-bright/30
                "
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-muted font-semibold mb-3">
          New listing
        </p>
        <h1 className="font-display text-3xl sm:text-[2.5rem] tracking-tight text-ink leading-[1.05]">
          List your{' '}
          <span className="italic font-light text-gold-deep">
            place.
          </span>
        </h1>
        <p className="mt-3 text-ink-soft leading-relaxed">
          It only takes a few minutes. You can save drafts and come back.
        </p>
      </div>

      {/* Optional verification nudge — listing is open to everyone, but a UMich
          student can earn the blue check so renters see their listing is from a
          verified student. Not shown once verified. */}
      {!isVerified && <VerifyBadgeNudge />}

      {/* Shortcut: import an existing post instead of filling this out by hand. */}
      <Link
        href="/import-listing"
        className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-maize-bright/50 transition"
      >
        <div>
          <p className="font-medium text-ink text-[15px]">
            Already posted this sublet somewhere else?
          </p>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Paste your post or upload screenshots — we’ll draft it for you.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-navy group-hover:gap-2 transition-all">
          Import it →
        </span>
      </Link>

      <ListingWizard userId={user.id} />
    </div>
  )
}
