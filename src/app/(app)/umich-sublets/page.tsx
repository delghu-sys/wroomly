import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeCheck, ArrowRight } from 'lucide-react'
import { clampMeta, clampTitle } from '@/lib/seo/meta'
import { NEIGHBORHOOD_CONTENT } from '@/lib/seo/neighborhoods'
import { fetchLatestActiveListings, fetchRentSample } from '@/lib/seo/fetch-listings'
import { summarizeRows, usd, MIN_SAMPLE } from '@/lib/seo/rent-stats'
import { BrandListingCard } from '@/components/listings/BrandListingCard'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/components/seo/JsonLd'

// SEO landing page for the head terms "umich sublet" and "university of
// michigan sublet". The homepage and /listings are about Ann Arbor in general;
// this page is about exactly that phrase, shows what is live, and answers the
// questions people ask first. Listings and the rent figure are live, so the
// page revalidates rather than being fixed at build time.
export const revalidate = 600

const TITLE = clampTitle('UMich Sublets in Ann Arbor: Verified Students')
const DESCRIPTION = clampMeta(
  'Browse University of Michigan sublets in Ann Arbor, posted by students. Summer and winter terms, with a blue check on verified UMich accounts.',
)

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/umich-sublets' },
  openGraph: { title: `${TITLE} | Wroomly`, description: DESCRIPTION, images: ['/og-default.png'] },
}

const SLS_URL = 'https://studentlegalservices.umich.edu/article/tips-subletting'

// Plain-text answers, 40-60 words each, self-contained so they can be quoted.
const FAQS = [
  {
    question: 'Can I sublet my apartment as a University of Michigan student?',
    answer:
      'Usually, but check your lease first. In Michigan a tenant generally needs the landlord’s written consent to sublet, either in the lease or in a separate signed document. U-M Student Legal Services advises putting the sublease in writing and keeping a copy, because you stay responsible to your landlord.',
  },
  {
    question: 'What is the best time to find a UMich sublet?',
    answer:
      'Summer sublets (May to August) are the most common, and most are posted from February through April. Winter sublets (January to April) appear from October through January, mostly from students leaving for study abroad or a co-op. Start looking six to eight weeks before you need to move in.',
  },
  {
    question: 'How do I know a sublet is real and not a scam?',
    answer:
      'Be wary of anyone who wants to rent sight unseen, asks for a wire, gift card or crypto, or pushes you off the platform. Tour in person or on video, confirm the person is a U-M student, and put the agreement in writing. On Wroomly, a blue check means the account signed in with a UMich Google account.',
  },
  {
    question: 'What does the blue check on Wroomly mean?',
    answer:
      'The blue check means the person signed in with their University of Michigan Google account, so the address belongs to a real U-M account holder. It is a badge only. It does not mean Wroomly has inspected the place or vouches for the lease, so you should still tour it and get the agreement in writing.',
  },
  {
    question: 'Is it free to list a sublet on Wroomly?',
    answer:
      'Yes. Listing is free. You can paste an existing post from another site and Wroomly turns it into a draft, which only you can edit and publish. Nothing goes live until you confirm it.',
  },
]

const GUIDE_LINKS = [
  { href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan', label: 'How to sublet your apartment at U-M' },
  { href: '/guides/how-to-avoid-sublet-scams-ann-arbor', label: 'How to avoid sublet scams' },
  { href: '/guides/winter-semester-sublets-ann-arbor', label: 'Winter semester sublets' },
  { href: '/guides/summer-sublets-in-ann-arbor-student-guide', label: 'Summer sublets guide' },
  { href: '/guides/security-deposits-ann-arbor-sublets', label: 'Security deposits' },
  { href: '/guides/ann-arbor-rent-prices', label: 'Ann Arbor rent prices (live)' },
]

const chip =
  'inline-flex items-center px-3.5 h-9 rounded-full text-[13px] font-medium bg-white/85 border border-line text-ink-soft hover:border-maize-bright/45 hover:text-ink transition'

export default async function UmichSubletsPage() {
  const [listings, rentSample] = await Promise.all([fetchLatestActiveListings(12), fetchRentSample()])
  const stats = summarizeRows(rentSample)
  const asOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'UMich sublets', path: '/umich-sublets' },
          ]),
          faqJsonLd(FAQS),
        ]}
      />
      <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'UMich sublets' }]} />

      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-deep font-bold mb-3">
          <BadgeCheck className="w-3.5 h-3.5" aria-hidden /> University of Michigan · Ann Arbor
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          UMich sublets{' '}
          <span className="italic font-light text-navy">in Ann Arbor.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          University of Michigan sublets posted by students, for summer and winter terms. Students who sign in with their
          UMich account carry a blue check, so you can tell who you are talking to.
        </p>

        {stats.overallMedianCents != null && stats.sampleSize >= MIN_SAMPLE && (
          <p className="mt-5 text-[15px] text-ink-soft leading-relaxed border-l-2 border-gold-deep/40 pl-4">
            The median asking rent for an Ann Arbor sublet on Wroomly is{' '}
            <strong className="text-ink font-semibold">{usd(stats.overallMedianCents)} per month</strong>, across{' '}
            {stats.sampleSize} active listings as of {asOf}.{' '}
            <Link href="/guides/ann-arbor-rent-prices" className="text-navy underline underline-offset-2 hover:text-gold-deep transition-colors">
              See rent by neighborhood and bedroom count
            </Link>
            .
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-navy-deep text-maize-bright text-sm font-semibold hover:bg-navy-deep/90 transition"
          >
            Browse all sublets <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <Link
            href="/list-place"
            className="inline-flex items-center h-11 px-5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:border-navy/40 transition"
          >
            List your place free
          </Link>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="newest-heading">
        <div className="flex items-end justify-between mb-6">
          <h2 id="newest-heading" className="font-display text-2xl tracking-tight text-ink">
            {listings.length > 0 ? 'Newest University of Michigan sublets' : 'No live sublets right now'}
          </h2>
          <Link href="/listings" className="text-sm text-navy hover:text-ink flex items-center gap-1 shrink-0">
            All listings <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => (
              <BrandListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center">
            <p className="text-ink-soft">Nothing is posted at the moment, but listings go up all the time.</p>
            <Link
              href="/match"
              className="inline-flex items-center gap-1.5 mt-4 h-11 px-5 rounded-full bg-navy-deep text-maize-bright text-sm font-semibold hover:bg-navy-deep/90 transition"
            >
              Get an alert when one posts <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      <section className="mt-14 pt-8 border-t border-line max-w-3xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-2xl tracking-tight text-ink mb-5">
          Subletting at U-M: common questions
        </h2>
        <dl className="space-y-6">
          {FAQS.map(f => (
            <div key={f.question}>
              <dt className="font-semibold text-ink">{f.question}</dt>
              <dd className="mt-1.5 text-[15px] text-ink-soft leading-relaxed">{f.answer}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] text-ink-muted">
          For the official advice, read{' '}
          <a href={SLS_URL} className="text-navy underline underline-offset-2 hover:text-gold-deep" rel="noopener">
            U-M Student Legal Services: Tips on Subletting
          </a>
          .
        </p>
      </section>

      <section className="mt-14 pt-8 border-t border-line">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">Sublets by neighborhood</p>
        <div className="flex flex-wrap gap-2">
          {NEIGHBORHOOD_CONTENT.map(n => (
            <Link key={n.slug} href={`/ann-arbor/${n.slug}`} className={chip}>
              {n.name}
            </Link>
          ))}
          <Link href="/buildings" className={chip}>
            By building
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">Guides</p>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map(g => (
            <Link key={g.href} href={g.href} className={chip}>
              {g.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
