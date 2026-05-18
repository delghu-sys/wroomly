import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Set a new password',
  description: 'Choose a new password for your Wroomly account.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ResetPasswordClient />
}
