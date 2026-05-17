import type { Metadata } from 'next'
import SignInClient from './SignInClient'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Wroomly account.',
  openGraph: {
    title: 'Sign In | Wroomly',
    description: 'Sign in to your Wroomly account.',
    images: ['/og-default.png'],
  },
}

export default function Page() {
  return <SignInClient />
}
