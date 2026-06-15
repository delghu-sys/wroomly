import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { Flag, ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import type { Report, User } from '@/types/database'

export const metadata: Metadata = {
  title: 'Reports — Admin',
  robots: { index: false, follow: false },
}

type ReportRow = Report & {
  reporter: Pick<User, 'id' | 'full_name' | 'email'> | null
}

const STATUS_TONES: Record<string, string> = {
  open: 'text-[oklch(0.55_0.15_25)] border-[oklch(0.85_0.10_25)] bg-[oklch(0.97_0.04_25)]',
  reviewing: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  resolved: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
  dismissed: 'text-ink-muted border-line bg-white',
}

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if ((profileData as { user_type?: string } | null)?.user_type !== 'admin') {
    redirect('/dashboard')
  }

  const { data: reportsData } = await supabase
    .from('reports')
    .select(
      `
      *,
      reporter:reporter_id ( id, full_name, email )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  const reports = (reportsData ?? []) as ReportRow[]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft size={14} weight="bold" />
        Back to admin
      </Link>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-2">
          Admin · Moderation
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.02]">
          Reports
        </h1>
        <p className="text-ink-soft mt-2">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'} on
          record.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white/55 backdrop-blur-sm p-10 text-center">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center"
            style={{
              background: 'oklch(0.22 0.075 256)',
              color: 'oklch(0.84 0.17 85)',
            }}
          >
            <Flag size={20} weight="duotone" />
          </div>
          <p className="font-display text-xl text-ink mt-4 leading-tight">
            No reports right now
          </p>
          <p className="text-sm text-ink-muted mt-2 max-w-md mx-auto">
            New reports from listing flags, message complaints, or user
            reports will land here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map(r => (
            <li
              key={r.id}
              className="rounded-2xl border border-line bg-white px-5 py-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-ink text-sm">
                    {r.target_type[0].toUpperCase() + r.target_type.slice(1)}{' '}
                    report
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Reporter:{' '}
                    {r.reporter?.full_name ?? r.reporter?.email ?? 'Unknown'} ·{' '}
                    {format(parseISO(r.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    STATUS_TONES[r.status] ?? STATUS_TONES.open
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-sm text-ink-soft mt-3 leading-relaxed">
                {r.reason}
              </p>
              <p className="text-[11px] text-ink-muted mt-2 font-mono">
                Target: {r.target_type}:{r.target_id}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
