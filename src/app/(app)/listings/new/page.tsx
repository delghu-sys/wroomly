import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingWizard } from '@/components/listings/ListingWizard'
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
    .select('user_type')
    .eq('id', user.id)
    .single()

  // ── Non-supplier interstitial — explains why we can't continue and
  //    points them somewhere useful, instead of a silent redirect. ──
  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div
          className="relative rounded-3xl overflow-hidden border border-line bg-white/85 backdrop-blur-xl p-8 sm:p-10"
          style={{
            boxShadow:
              'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 18px 50px oklch(0 0 0 / 0.06)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
            aria-hidden
          />

          <div className="relative">
            <div
              className="inline-flex w-12 h-12 rounded-2xl items-center justify-center shadow-[0_6px_20px_oklch(0.84_0.17_85/0.30)]"
              style={{
                background: 'oklch(0.22 0.075 256)',
                color: 'oklch(0.84 0.17 85)',
              }}
            >
              <House size={22} weight="duotone" />
            </div>

            <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] mt-6">
              Listing is{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                supplier-only.
              </span>
            </h1>

            <p className="mt-4 text-ink-soft leading-relaxed max-w-[55ch]">
              Only verified U-of-M students can post a place. Your account is
              registered as a consumer, so the listing wizard is unavailable.
            </p>

            <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-2xl bg-[oklch(0.84_0.17_85/0.08)] border border-[oklch(0.84_0.17_85/0.25)]">
              <EnvelopeOpen
                size={18}
                weight="duotone"
                className="text-[oklch(0.45_0.13_85)] mt-0.5 shrink-0"
              />
              <p className="text-[13.5px] text-ink-soft leading-relaxed">
                To become a supplier, sign up again with a{' '}
                <strong className="font-semibold text-[oklch(0.32_0.10_85)]">
                  @umich.edu
                </strong>{' '}
                email. The system verifies the domain server-side.
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
                  hover:border-[oklch(0.84_0.17_85/0.40)] hover:text-ink
                  transition-all duration-300 active:scale-[0.97]
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]
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
          <span className="italic font-light text-[oklch(0.45_0.13_85)]">
            place.
          </span>
        </h1>
        <p className="mt-3 text-ink-soft leading-relaxed">
          It only takes a few minutes. You can save drafts and come back.
        </p>
      </div>

      {/* Shortcut: import an existing post instead of filling this out by hand. */}
      <Link
        href="/import-listing"
        className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-[oklch(0.84_0.17_85/0.5)] transition"
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
