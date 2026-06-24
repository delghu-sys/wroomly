import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/brand/Logo'
import { Sparkles, PencilLine, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'List your place | Wroomly',
  description:
    'List your Ann Arbor sublet — import it from an existing post in seconds, or create it yourself.',
}

/**
 * Supplier "List your place" chooser: import from an existing post (AI) or
 * build the listing manually. The manual path's destination depends on the
 * viewer's auth state so anon suppliers land in the supplier sign-up funnel
 * rather than a generic /sign-in bounce.
 */
export default async function StartListingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let manualHref = '/sign-up?as=supplier&next=/listings/new' // anon default
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()
    const t = (profile as { user_type?: string } | null)?.user_type
    manualHref = t === 'supplier' || t === 'admin' ? '/listings/new' : '/list-place'
  }

  return (
    <main className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-16">
      <Link href="/coming-soon" className="flex items-center gap-2 mb-10">
        <LogoMark size={26} />
        <span className="font-display text-lg font-semibold tracking-tighter text-ink">
          wroomly
        </span>
      </Link>

      <div className="text-center mb-9">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-muted font-semibold mb-3">
          List your place
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] text-balance">
          How do you want to{' '}
          <span className="italic font-light text-[oklch(0.45_0.13_85)]">
            start?
          </span>
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* AI import */}
        <Link
          href="/import-listing"
          className="group relative flex flex-col rounded-3xl border border-line bg-white/80 backdrop-blur-xl p-7 transition-all hover:shadow-[0_18px_50px_oklch(0_0_0/0.08)] hover:-translate-y-0.5"
        >
          <span className="absolute top-5 right-5 inline-flex items-center rounded-full bg-maize px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[oklch(0.22_0.075_256)]">
            Fastest
          </span>
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-2xl bg-[oklch(0.45_0.13_85)]/10 text-[oklch(0.45_0.13_85)] mb-5">
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </span>
          <h2 className="font-display text-xl text-ink tracking-tight">
            Import from a post
          </h2>
          <p className="text-ink-muted text-sm leading-relaxed mt-2 flex-1">
            Paste a link or screenshot your existing listing — our AI builds it
            for you in about a minute.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink mt-5 group-hover:text-[oklch(0.45_0.13_85)] transition-colors">
            Import it
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </span>
        </Link>

        {/* Manual */}
        <Link
          href={manualHref}
          className="group relative flex flex-col rounded-3xl border border-line bg-white/80 backdrop-blur-xl p-7 transition-all hover:shadow-[0_18px_50px_oklch(0_0_0/0.08)] hover:-translate-y-0.5"
        >
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-2xl bg-ink/[0.06] text-ink mb-5">
            <PencilLine className="w-5 h-5" strokeWidth={2} />
          </span>
          <h2 className="font-display text-xl text-ink tracking-tight">
            Create it yourself
          </h2>
          <p className="text-ink-muted text-sm leading-relaxed mt-2 flex-1">
            Fill in the details step by step — photos, price, dates, and
            amenities. Full control.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink mt-5 group-hover:text-[oklch(0.45_0.13_85)] transition-colors">
            Start from scratch
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </span>
        </Link>
      </div>
    </main>
  )
}
