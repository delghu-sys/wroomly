import type { Metadata } from 'next'
import { Suspense } from 'react'
import SignUpClient from './SignUpClient'
import { SUPPLY_ONLY_MODE } from '@/lib/config'

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
  // useSearchParams() inside SignUpClient forces a Suspense boundary
  // during prerender — Next refuses to statically generate the page
  // without one. Wrapping here keeps the page eligible for partial
  // prerendering while letting the role-picker hydrate from ?as=...
  return (
    <Suspense fallback={null}>
      <SignUpClient supplyOnly={SUPPLY_ONLY_MODE} />
    </Suspense>
  )
}
