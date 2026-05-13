import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Search,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  KeyRound,
  ArrowRight,
  Lock,
  BadgeCheck,
  Eye,
  AlertTriangle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How it works — Wroomly',
  description:
    'How Wroomly works: verified U-M students, secure payments, in-app messaging, and a trust & safety review for every listing.',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-grain" aria-hidden />
        <div
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full -z-10 blur-3xl opacity-60"
          style={{ background: 'radial-gradient(closest-side, var(--maize-soft), transparent)' }}
          aria-hidden
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 backdrop-blur px-3 py-1 text-xs font-medium text-ink-soft">
            <Sparkles className="w-3.5 h-3.5 text-[oklch(0.7_0.14_92)]" />
            How it works
          </div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-tight text-ink mt-6 text-balance">
            Make room for
            <span className="italic font-light text-navy"> connection.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-2xl">
            Wroomly is a verified marketplace for sublets and apartment swaps between
            University of Michigan students. Every listing is reviewed, every payment is
            secured, and every conversation stays on-platform.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="font-display text-3xl tracking-tight text-ink mb-10">The flow</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <Step
            icon={<Search className="w-5 h-5" />}
            n="01"
            title="Browse or list"
            body="Suppliers post a sublet or a swap in a few minutes. Consumers filter by neighborhood, dates, price, and amenities to find a place that fits."
          />
          <Step
            icon={<MessageSquare className="w-5 h-5" />}
            n="02"
            title="Message securely"
            body="Talk to the other side inside the app. No phone numbers traded, no email back-and-forth, no Craigslist surprises."
          />
          <Step
            icon={<ShieldCheck className="w-5 h-5" />}
            n="03"
            title="Apply with proof"
            body="Submit a quick application with your U-M info. Suppliers review and accept the candidate they want."
          />
          <Step
            icon={<CreditCard className="w-5 h-5" />}
            n="04"
            title="Pay & hold"
            body="Rent and deposit run through secure payments. Funds aren't released until both sides confirm move-in is good."
          />
          <Step
            icon={<KeyRound className="w-5 h-5" />}
            n="05"
            title="Move in"
            body="Coordinate keys and check-in inside the platform. Disputes (rare) get a human review from our team."
          />
          <Step
            icon={<BadgeCheck className="w-5 h-5" />}
            n="06"
            title="Review"
            body="After move-in, both sides leave a public review. Reputation makes the next booking easier for everyone."
          />
        </div>
      </section>

      {/* Trust & safety */}
      <section id="trust" className="bg-surface border-y border-line scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-ink-soft mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-navy" />
            Trust & safety
          </div>
          <h2 className="font-display text-3xl tracking-tight text-ink mb-3">
            Built for students, not strangers.
          </h2>
          <p className="text-ink-soft max-w-2xl leading-relaxed">
            We&apos;re a small platform on purpose — verified accounts, reviewed listings, and
            payments that never go off-platform.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <TrustCard
              icon={<BadgeCheck className="w-5 h-5" />}
              title="Verified U-M accounts"
              body="Suppliers and consumers verify their identity and university affiliation before posting or applying."
            />
            <TrustCard
              icon={<Eye className="w-5 h-5" />}
              title="Every listing reviewed"
              body="An AI moderator scans each new listing for scams, off-platform contact, and discriminatory language. Borderline cases go to a human admin before they go live."
            />
            <TrustCard
              icon={<Lock className="w-5 h-5" />}
              title="Payments held in escrow"
              body="Rent and deposit are charged through Stripe and only released after both parties confirm move-in. No wire transfers, no Venmo strangers."
            />
            <TrustCard
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Report anything"
              body="Suspicious DM, off-platform offer, or a listing that feels off? Hit Report and we look at it fast. Repeat offenders get banned."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-ink">
          Ready to find your next place?
        </h2>
        <p className="mt-4 text-ink-soft max-w-xl mx-auto">
          Browse current sublets and swaps, or list your own in a few minutes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/listings">
            <Button size="lg">
              Browse listings <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/listings/new">
            <Button size="lg" variant="outline">List your place</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function Step({
  icon,
  n,
  title,
  body,
}: {
  icon: React.ReactNode
  n: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-background p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-navy/5 text-navy flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-medium tracking-[0.15em] text-ink-muted">{n}</span>
      </div>
      <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </div>
  )
}

function TrustCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-background p-6">
      <div className="w-9 h-9 rounded-lg bg-navy/5 text-navy flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-ink mb-1.5">{title}</h3>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </div>
  )
}
