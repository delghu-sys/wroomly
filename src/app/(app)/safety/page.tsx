import type { Metadata } from 'next'
import { LegalPage, loadLegalDoc } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Trust & Safety: How Wroomly Protects Renters',
  description:
    'How Wroomly keeps the platform safe: verified U-M students, reviewed listings, on-platform messaging, the community rules, and how to protect yourself.',
  alternates: { canonical: '/safety' },
}

// The policy text lives in content/legal/ and is rendered verbatim — see
// LegalPage. Edit the markdown, not this file.
export default function Page() {
  return <LegalPage doc={loadLegalDoc('wroomly-trust-and-safety.md')} />
}
