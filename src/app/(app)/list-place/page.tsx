import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { MagneticLinkCta } from '@/components/brand/MagneticLinkCta'
import { PaperPlaneTilt } from '@phosphor-icons/react/dist/ssr'
import { Home, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'List your place',
  description: 'Sublet your apartment to verified U of M students.',
}

/**
 * Smart entry point for the "List your place" CTA.
 *
 *   Not signed in            → /sign-up with the supplier intent prefilled.
 *   Signed in (supplier/admin) → /listings/new, no detour.
 *   Signed in (consumer)     → friendly "you need a supplier account"
 *                              screen with a clear action.
 *
 * The previous behavior dumped every click onto /sign-up, which forced
 * already-authed consumers to re-pick their account type — confusing
 * since they'd just made that choice once.
 */
export default async function ListPlacePage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Unauthenticated → into the sign-up funnel with role pre-selected.
  // The sign-up page reads `?as=supplier` to pre-toggle the role.
  if (!authUser) {
    redirect('/sign-up?as=supplier&next=/listings/new')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('user_type, email')
    .eq('id', authUser.id)
    .single()

  const userType = (profile as { user_type?: string } | null)?.user_type
  if (userType === 'supplier' || userType === 'admin') {
    redirect('/listings/new')
  }

  // Consumer signed in — show the explanatory screen.
  const email = (profile as { email?: string } | null)?.email ?? authUser.email ?? ''

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-lg w-full text-center animate-fade-up">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          List your place
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] text-balance">
          You&rsquo;re signed in as a{' '}
          <span className="italic font-light text-[oklch(0.45_0.13_85)]">
            consumer.
          </span>
        </h1>
        <p className="mt-5 text-ink-muted text-base leading-relaxed max-w-md mx-auto">
          That&rsquo;s the side of Wroomly for finding a sublet. To list your
          own place, you need a separate supplier account.
        </p>

        {/* Status line — show the current email so they know which
            account they're signed in as. */}
        <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-line/70 bg-white/60 backdrop-blur-sm px-5 py-3 text-sm">
          <Mail className="w-4 h-4 text-[oklch(0.45_0.13_85)]" strokeWidth={2} />
          <span className="text-ink-soft">Signed in as</span>
          <span className="font-medium text-ink truncate max-w-[200px] sm:max-w-none">
            {email}
          </span>
        </div>

        <p className="mt-7 text-[13px] text-ink-muted leading-relaxed max-w-md mx-auto">
          Sign out of this account first, then sign up again as a supplier
          with a different email address.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <MagneticLinkCta
            href="/sign-up?as=supplier&next=/listings/new"
            variant="primary"
            icon={<PaperPlaneTilt size={16} weight="fill" className="-rotate-12" />}
          >
            Create a supplier account
          </MagneticLinkCta>
          <Link href="/listings">
            <Button
              variant="outline"
              className="h-12 px-5 rounded-full border-line hover:border-[oklch(0.84_0.17_85/0.50)]"
            >
              <Home className="w-4 h-4 mr-1.5" /> Browse instead
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
