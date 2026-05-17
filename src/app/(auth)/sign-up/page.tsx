import type { Metadata } from 'next'
import SignUpClient from './SignUpClient'

// The desired title doesn't fit the "%s | Wroomly" template — use `absolute`
// to bypass the root template and render exactly this string.
export const metadata: Metadata = {
  title: {
    absolute: 'Join Wroomly — Find or List Student Housing',
  },
  description:
    'Sign up to sublet or swap your U of M apartment, or find verified student housing in Ann Arbor.',
  openGraph: {
    title: 'Join Wroomly — Find or List Student Housing',
    description:
      'Sign up to sublet or swap your U of M apartment, or find verified student housing in Ann Arbor.',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Wroomly — Find or List Student Housing',
    description:
      'Sign up to sublet or swap your U of M apartment, or find verified student housing in Ann Arbor.',
    images: ['/og-default.png'],
  },
}

export default function Page() {
  return <SignUpClient />
}
