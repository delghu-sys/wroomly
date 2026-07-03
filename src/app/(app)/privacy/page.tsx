import type { Metadata } from 'next'
import Link from 'next/link'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Wroomly collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy | Wroomly',
    description:
      'How Wroomly collects, uses, and protects your personal information.',
    images: ['/og-default.png'],
  },
}

const EFFECTIVE_DATE = 'May 12, 2026'

export default function PrivacyPage() {
  return (
    <div className="bg-[oklch(0.985_0.006_85)]">
      {/* ── Atmospheric hero ── */}
      <section className="relative isolate overflow-hidden -mt-16 pt-16">
        <AtmosphericBackground variant="hero" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-semibold mb-5">
            Legal
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-tight text-white leading-[0.98]">
            Privacy{' '}
            <span className="italic font-light text-[oklch(0.84_0.17_85)]">
              policy.
            </span>
          </h1>
          <div className="mt-7 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-sm border border-white/[0.07]">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-semibold">
              Effective
            </span>
            <span className="text-[12.5px] font-medium text-white/85">
              {EFFECTIVE_DATE}
            </span>
          </div>
          <p className="mt-7 text-base sm:text-lg text-white/65 leading-relaxed max-w-2xl">
            A short, plain-English summary of what we collect, why, and what
            you can do about it. The full legal text is being prepared and will
            replace this stub soon.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div
          className="rounded-3xl border border-[oklch(0.84_0.17_85/0.35)] bg-white/85 backdrop-blur-xl p-5 sm:p-6 mb-10 flex gap-4"
          style={{
            boxShadow:
              'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 6px 24px oklch(0.84 0.17 85 / 0.10)',
          }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-[0_4px_14px_oklch(0.84_0.17_85/0.30)]"
            style={{
              background: 'oklch(0.22 0.075 256)',
              color: 'oklch(0.84 0.17 85)',
            }}
          >
            <ShieldCheck size={18} weight="duotone" />
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[oklch(0.32_0.10_85)] font-semibold">
              The short version
            </p>
            <p className="font-display text-lg sm:text-xl tracking-tight text-ink mt-1 leading-tight">
              We collect what we need to verify you and run the platform — and
              nothing else.
            </p>
          </div>
        </div>

        <article
          className="
            space-y-7
            [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-tight [&_h2]:text-ink [&_h2]:leading-tight [&_h2]:mt-2
            [&_p]:text-ink-soft [&_p]:leading-relaxed [&_p]:max-w-[65ch]
            [&_strong]:font-semibold [&_strong]:text-[oklch(0.32_0.10_85)]
            [&_a]:text-[oklch(0.45_0.13_85)] [&_a]:underline-offset-4 [&_a]:underline
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:max-w-[65ch]
            [&_ul>li]:text-ink-soft [&_ul>li]:leading-relaxed
            [&_ul>li::marker]:text-[oklch(0.45_0.13_85)]
          "
        >
          <section>
            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Account info</strong> — your name, email, university
                affiliation, and password hash.
              </li>
              <li>
                <strong>Listing content</strong> — photos, descriptions, dates,
                and pricing that you publish on the platform.
              </li>
              <li>
                <strong>Messages</strong> — conversations between Suppliers and
                Consumers, stored to support disputes and moderation.
              </li>
              <li>
                <strong>Payment metadata</strong> — billing identifiers from
                Stripe, never raw card numbers.
              </li>
              <li>
                <strong>Usage telemetry</strong> — basic device/browser info
                and pages visited, used for product analytics and abuse
                detection.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use it</h2>
            <p>
              To verify you as a student, match Suppliers with Consumers,
              process payments held in escrow, prevent fraud and abuse, and
              improve the product. We do <strong>not</strong> sell personal
              information to third parties.
            </p>
          </section>

          <section>
            <h2>Who we share it with</h2>
            <p>
              Limited service providers (Supabase for hosting/auth, Stripe for
              payments, Resend for transactional email, an analytics provider).
              These vendors process data on our behalf under contractual
              confidentiality. We may also share information when required by
              law or to protect the safety of our users.
            </p>
          </section>

          <section>
            <h2>Your rights</h2>
            <p>
              You can request a copy of your data, correct inaccuracies, or
              delete your account at any time. Some records (e.g., payment
              receipts) may be retained for legal and accounting reasons.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Privacy questions go to{' '}
              <a href="mailto:privacy@wroomly.com">privacy@wroomly.com</a>. For
              the broader user agreement, see our{' '}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
