import type { Metadata } from 'next'
import Link from 'next/link'
import '../match.css'
import { getAlertByToken } from '@/lib/match/alerts'
import { humanizeCriteria } from '@/lib/match/criteria'
import { MatchManage } from './MatchManage'

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
              <img src="/logo.png" alt="Wroomly" width={26} height={26} />
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

  return (
    <MatchManage
      token={alert.manage_token}
      email={alert.email}
      tags={humanizeCriteria(alert.criteria)}
      initialStatus={alert.status}
      initialFrequency={alert.frequency}
      justUnsubscribed={unsubscribed === '1'}
    />
  )
}
