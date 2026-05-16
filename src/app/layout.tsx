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

export const metadata: Metadata = {
  title: {
    default: 'Wroomly — Make Room for Connection',
    template: '%s | Wroomly',
  },
  description:
    'Verified student housing marketplace for subletting and swapping near the University of Michigan. Find or list your place safely with U of M student verification.',
  keywords: ['University of Michigan', 'student housing', 'sublet', 'Ann Arbor', 'housing swap'],
  openGraph: {
    title: 'Wroomly — Make Room for Connection',
    description: 'Verified student housing marketplace — sublet or swap near the University of Michigan.',
    type: 'website',
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
