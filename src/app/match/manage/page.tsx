import type { Metadata } from 'next'
import Link from 'next/link'
import '../match.css'
import { getAlertByToken } from '@/lib/match/alerts'
import { humanizeProfile, resolveProfile } from '@/lib/match/profile'
import { createServiceClient } from '@/lib/supabase/server'
import { MatchManage, type SentMatch } from './MatchManage'

export const metadata: Metadata = {
  title: 'Manage your Wroomly Match alerts',
  robots: { index: false, follow: false },
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; unsubscribed?: string }>
}) {
  const { token, unsubscribed } = await searchParams
  const alert = token ? await getAlertByToken(token) : null

  if (!alert) {
    return (
      <div className="wm">
        <div className="wm-screen wm-summary">
          <nav className="navbar navbar-light">
            <Link href="/" className="logo" aria-label="Wroomly home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" width={26} height={26} />
              <span className="logo-word logo-dark">wroomly</span>
            </Link>
          </nav>
          <main className="summary-main">
            <div className="summary-card">
              <p className="s-eyebrow">Wroomly Match</p>
              <h2 className="s-h2">This link isn’t valid</h2>
              <p className="s-hint">
                The manage link may have expired or been mistyped. You can set up a fresh
                alert any time.
              </p>
              <div className="s-divider" style={{ marginTop: '1.25rem' }} />
              <Link href="/match" className="btn-notify" style={{ textDecoration: 'none' }}>
                Start a new alert
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const profile = resolveProfile(alert.profile, alert.criteria)

  // Recent matches we've emailed (newest first) + their thumbs state, so the
  // renter can see what the engine picked and why.
  const service = createServiceClient()
  const { data: sends } = await service
    .from('match_alert_sends')
    .select('id, listing_id, score, note, feedback, emailed_at, listings:listing_id ( title )')
    .eq('alert_id', alert.id)
    .order('emailed_at', { ascending: false })
    .limit(10)

  const history: SentMatch[] = ((sends ?? []) as unknown as {
    id: string
    listing_id: string
    score: number | null
    note: string | null
    feedback: 'up' | 'down' | null
    emailed_at: string
    listings: { title: string } | { title: string }[] | null
  }[]).map(s => {
    const l = Array.isArray(s.listings) ? s.listings[0] : s.listings
    return {
      id: s.id,
      listingId: s.listing_id,
      title: l?.title ?? 'Listing',
      score: s.score != null ? Math.round(s.score) : null,
      note: s.note,
      feedback: s.feedback,
      emailedAt: s.emailed_at,
    }
  })

  return (
    <MatchManage
      token={alert.manage_token}
      email={alert.email}
      profile={profile}
      tags={humanizeProfile(profile)}
      history={history}
      initialStatus={alert.status}
      initialFrequency={alert.frequency}
      justUnsubscribed={unsubscribed === '1'}
    />
  )
}
