import type { Metadata } from 'next'
import { LegalPage, loadLegalDoc } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What Wroomly collects, why, who we share it with, and the choices you have.',
  alternates: { canonical: '/privacy' },
}

// The policy text lives in content/legal/ and is rendered verbatim — see
// LegalPage. Edit the markdown, not this file.
export default function Page() {
  return <LegalPage doc={loadLegalDoc('wroomly-privacy-policy.md')} />
}
