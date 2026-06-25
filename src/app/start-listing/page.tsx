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

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

const MAIZE_DEEP = 'oklch(0.74 0.16 85)'
const NAVY = 'oklch(0.22 0.075 256)'

/**
 * Supplier "List your place" chooser: import from an existing post (AI) or
 * build the listing manually. The manual path's destination depends on the
 * viewer's auth state so anon suppliers land in the supplier sign-up funnel.
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
    manualHref =
      t === 'supplier' || t === 'admin' ? '/listings/new' : '/list-place'
  }

  return (
    <div className="relative isolate overflow-hidden min-h-dvh flex flex-col bg-background">
      {/* ── Atmospheric background (cream-tuned) ─────────────────────────── */}
      <div
        className="absolute top-[-12%] right-[-8%] w-[620px] h-[620px] rounded-full blur-[130px] -z-10 animate-float-slow"
        style={{ background: 'oklch(0.86 0.17 92 / 0.22)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-[-10%] left-[-6%] w-[520px] h-[520px] rounded-full blur-[110px] -z-10 animate-float"
        style={{ background: 'oklch(0.22 0.075 256 / 0.06)' }}
        aria-hidden
      />
      <div
        className="absolute top-[42%] left-[40%] w-[300px] h-[300px] rounded-full blur-[90px] -z-10"
        style={{ background: 'oklch(0.50 0.11 280 / 0.04)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.025] mix-blend-multiply"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
        aria-hidden
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-[62px] bg-background/88 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl h-full px-5 sm:px-6 flex items-center">
          <Link href="/coming-soon" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-display text-lg font-semibold tracking-tighter text-ink">
              wroomly
            </span>
          </Link>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 grid place-items-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-[42rem]">
          {/* Heading block */}
          <div className="text-center">
            <p
              className="animate-fade-up inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ink-muted font-display"
              style={{ animationDelay: '0.05s' }}
            >
              <span className="w-[5px] h-[5px] rounded-full bg-maize" />
              List your place
            </p>
            <h1
              className="animate-fade-up font-display font-bold text-ink text-balance mt-4 tracking-[-0.04em] leading-[1.06]"
              style={{
                animationDelay: '0.15s',
                fontSize: 'clamp(2.1rem, 7.5vw, 3rem)',
              }}
            >
              How do you want to{' '}
              <span className="italic font-light" style={{ color: MAIZE_DEEP }}>
                start?
              </span>
            </h1>
            <p
              className="animate-fade-up text-ink-muted mt-4 leading-[1.72] max-w-[30rem] mx-auto"
              style={{ animationDelay: '0.27s', fontSize: '1rem' }}
            >
              Pick a path — you’ll be live in about a minute either way.
            </p>
          </div>

          {/* Option cards */}
          <div className="grid sm:grid-cols-2 gap-[1.125rem] mt-10">
            {/* Card A — Import (recommended) */}
            <Link
              href="/import-listing"
              className="group animate-fade-up relative isolate overflow-hidden flex flex-col rounded-[1.5rem] border-[1.5px] border-[oklch(0.86_0.17_92/0.28)] p-7 transition-all duration-300 hover:-translate-y-[5px] hover:border-[oklch(0.86_0.17_92/0.68)] hover:shadow-[0_22px_64px_oklch(0.86_0.17_92/0.22)]"
              style={{
                animationDelay: '0.4s',
                background:
                  'linear-gradient(175deg, oklch(0.86 0.17 92 / 0.10) 0%, white 50%)',
              }}
            >
              {/* Sheen sweep */}
              <span
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:left-[120%] group-hover:opacity-100"
                aria-hidden
              />
              {/* Fastest badge */}
              <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-full bg-maize px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[oklch(0.22_0.075_256)] font-display">
                <span className="w-[4px] h-[4px] rounded-full bg-[oklch(0.22_0.075_256/0.4)]" />
                Fastest
              </span>

              <span
                className="inline-flex w-[50px] h-[50px] items-center justify-center rounded-[0.875rem] text-maize transition-transform duration-300 group-hover:scale-[1.06] group-hover:rotate-[-4deg]"
                style={{
                  background: NAVY,
                  boxShadow: '0 6px 20px oklch(0.22 0.075 256 / 0.22)',
                }}
              >
                <Sparkles className="w-5 h-5" strokeWidth={2} />
              </span>

              <h2 className="font-display font-bold text-ink tracking-[-0.035em] mt-5 text-[1.1875rem]">
                Import from a post
              </h2>
              <p className="text-ink-muted text-sm leading-relaxed mt-2 flex-1">
                Paste a link or screenshot your existing listing — our AI builds
                it for you in about a minute.
              </p>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-semibold mt-5 transition-all group-hover:gap-2.5"
                style={{ color: MAIZE_DEEP }}
              >
                Import it
                <ArrowRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-[3px]"
                  strokeWidth={2.25}
                />
              </span>
            </Link>

            {/* Card B — Manual */}
            <Link
              href={manualHref}
              className="group animate-fade-up relative isolate overflow-hidden flex flex-col rounded-[1.5rem] border-[1.5px] border-border bg-white p-7 transition-all duration-300 hover:-translate-y-[5px] hover:border-[oklch(0.22_0.075_256/0.18)] hover:shadow-[0_20px_56px_oklch(0.22_0.075_256/0.08)]"
              style={{ animationDelay: '0.53s' }}
            >
              <span className="inline-flex w-[50px] h-[50px] items-center justify-center rounded-[0.875rem] bg-[oklch(0.96_0.008_85)] text-ink-soft transition-all duration-300 group-hover:scale-[1.06] group-hover:rotate-[-3deg] group-hover:bg-[oklch(0.22_0.075_256)] group-hover:text-maize">
                <PencilLine className="w-5 h-5" strokeWidth={2} />
              </span>

              <h2 className="font-display font-bold text-ink tracking-[-0.035em] mt-5 text-[1.1875rem]">
                Create it yourself
              </h2>
              <p className="text-ink-muted text-sm leading-relaxed mt-2 flex-1">
                Fill in the details step by step — photos, price, dates, and
                amenities. Full control.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.22_0.075_256)] mt-5 transition-all group-hover:gap-2.5">
                Start from scratch
                <ArrowRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-[3px]"
                  strokeWidth={2.25}
                />
              </span>
            </Link>
          </div>

          {/* Trust strip */}
          <div
            className="animate-fade-up flex flex-wrap items-center justify-center gap-2.5 mt-9 text-[0.8125rem] font-medium text-ink-muted"
            style={{ animationDelay: '0.65s' }}
          >
            <span>Free, always</span>
            <span className="w-[3px] h-[3px] rounded-full bg-line" />
            <span>~60-second listing</span>
            <span className="w-[3px] h-[3px] rounded-full bg-line" />
            <span>Verified U of M students</span>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-[oklch(0.22_0.075_256)] px-6 py-6">
        <div
          className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full blur-[90px] opacity-25"
          style={{ background: 'oklch(0.86 0.17 92 / 0.5)' }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tighter text-white">
              wroomly
            </span>
          </div>
          <p className="text-white/[0.36] text-xs">
            <a href="https://wroomly.app" className="hover:text-white/60 transition">
              wroomly.app
            </a>{' '}
            · © {new Date().getFullYear()} Wroomly · Not affiliated with the
            University of Michigan.
          </p>
        </div>
      </footer>
    </div>
  )
}
