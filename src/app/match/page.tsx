import type { Metadata } from 'next'
import './match.css'
import { MatchExperience } from './MatchExperience'

export const metadata: Metadata = {
  title: 'Wroomly Match — get new Ann Arbor sublets emailed to you',
  description:
    'Tell our AI what you’re looking for in about 60 seconds and we’ll email you the moment a matching sublet is posted on Wroomly. Free, no account needed.',
  alternates: { canonical: '/match' },
}

export default function MatchPage() {
  return <MatchExperience />
}
