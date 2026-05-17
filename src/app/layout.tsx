import type { Metadata } from 'next'
import { Syne, Instrument_Sans, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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
})

// Set the canonical origin for all metadata URLs (og:image, twitter:image,
// canonical, etc.). Allows per-page metadata to use relative paths like
// `/og-default.png` and have them resolved correctly in social cards.
export const metadata: Metadata = {
  metadataBase: new URL('https://wroomly.app'),
  title: {
    default: 'Wroomly — Make Room for Connection',
    template: '%s | Wroomly',
  },
  description:
    'Verified student housing marketplace for subletting and swapping near the University of Michigan. Find or list your place safely with U of M student verification.',
  keywords: [
    'University of Michigan',
    'student housing',
    'sublet',
    'Ann Arbor',
    'housing swap',
  ],
  // NOTE: /og-default.png is a placeholder — drop a real 1200×630 OG image
  // (navy background, maize logo, headline) into /public to ship.
  openGraph: {
    title: 'Wroomly — Make Room for Connection',
    description:
      'Verified student housing marketplace — sublet or swap near the University of Michigan.',
    type: 'website',
    siteName: 'Wroomly',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Wroomly — Make Room for Connection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wroomly — Make Room for Connection',
    description:
      'Verified student housing marketplace — sublet or swap near the University of Michigan.',
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
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
