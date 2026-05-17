import type { Metadata } from 'next'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Send yourself a reset link for your Wroomly account.',
  openGraph: {
    title: 'Reset Password | Wroomly',
    description: 'Send yourself a reset link for your Wroomly account.',
    images: ['/og-default.png'],
  },
}

export default function Page() {
  return <ForgotPasswordClient />
}
