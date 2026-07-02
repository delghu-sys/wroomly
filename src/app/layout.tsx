import type { Metadata } from 'next'
import { Syne, Instrument_Sans, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { JsonLd, siteJsonLd } from '@/components/seo/JsonLd'

const body = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const display = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Set the canonical origin for all metadata URLs (og:image, twitter:image,
// canonical, etc.). Allows per-page metadata to use relative paths like
// `/og-default.png` and have them resolved correctly in social cards.
// SEO: titles + descriptions lead with real user-intent keywords
// (UMich sublet / Ann Arbor sublet / student housing) rather than the
// bare brand "Wroomly", which collides with the established "Vroomly".
// The template appends " | Wroomly — UMich Student Sublets" so even
// deep pages carry the intent keywords into the SERP title.
export const metadata: Metadata = {
  metadataBase: new URL('https://wroomly.app'),
  title: {
    default:
      'Wroomly — University of Michigan Sublets & Student Housing in Ann Arbor',
    template: '%s | Wroomly — UMich Student Sublets',
  },
  description:
    'University of Michigan student sublets in Ann Arbor — verified @umich.edu students, escrow payments, no scams. Find a summer sublet near campus or list your place.',
  keywords: [
    'University of Michigan sublet',
    'UMich sublet',
    'U of M sublet',
    'Ann Arbor sublet',
    'Ann Arbor summer sublet',
    'sublease Ann Arbor',
    'University of Michigan student housing',
    'Ann Arbor student housing',
  ],
  alternates: {
    canonical: '/',
  },
  // Google Search Console domain/URL-prefix verification. Renders as
  // <meta name="google-site-verification" content="…"> in <head>.
  verification: {
    google: 'pWJX73rXPY1_5JM6qjWQq1YT7trlQibJCNcvkJQB1ks',
  },
  // NOTE: /og-default.png is a placeholder — drop a real 1200×630 OG image
  // (navy background, maize logo, headline) into /public to ship.
  openGraph: {
    title: 'Wroomly — University of Michigan Sublets in Ann Arbor',
    description:
      'Verified UMich student sublets in Ann Arbor. @umich.edu-only, escrow payments.',
    type: 'website',
    siteName: 'Wroomly',
    locale: 'en_US',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Wroomly — University of Michigan student sublets in Ann Arbor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wroomly — University of Michigan Sublets in Ann Arbor',
    description:
      'Verified UMich student sublets in Ann Arbor. @umich.edu-only, escrow payments.',
    images: ['/og-default.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={siteJsonLd()} />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
