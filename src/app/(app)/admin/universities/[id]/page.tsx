import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { UniversityEditor } from '@/components/admin/universities/UniversityEditor'
import { FollowupEditor } from '@/components/admin/universities/FollowupEditor'
import { followupEnvelope } from '@/lib/universities/followup-runner'
import { FOLLOWUP_MIN_DAYS, daysSince, followupApprovalHash, followupState } from '@/lib/universities/followup'
import { envelopeFor, loadSettings, type Prospect } from '@/lib/universities/runner'
import { approvalHash, formatFrom, senderProblems } from '@/lib/universities/gate'

export const metadata: Metadata = { title: 'Admin: University', robots: { index: false, follow: false } }

const CONF = { verified: 'Verified: seen on the office’s own page', likely: 'Likely: a general address on an official page', not_found: 'No address found' } as const

export default async function AdminUniversityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const service = createServiceClient()
  const { data: me } = await service.from('users').select('user_type').eq('id', user.id).single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const { data } = await service.from('university_prospects').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const p = data as Prospect
  const settings = await loadSettings(service)
  const problems = senderProblems(settings)
  const env = envelopeFor(p, settings)

  const link = (href: string | null, label: string) =>
    href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink">{label} <ExternalLink className="w-3 h-3" /></a> : null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/admin/universities" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Partner universities
      </Link>
      <h1 className="font-display text-3xl tracking-tight text-ink">{p.name}</h1>
      <p className="text-ink-muted mt-1">{[p.city, p.country].filter(Boolean).join(', ')} · {p.status}</p>

      <div className="rounded-3xl border border-line bg-surface p-6 shadow-1 mt-6 text-[13.5px] text-ink-soft space-y-1.5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-2">Research</p>
        <p><span className="text-ink-muted">Michigan program:</span> {p.umich_units.length ? p.umich_units.join(', ') : 'not specified'} {link(p.evidence_url, 'evidence')}</p>
        <p><span className="text-ink-muted">Office:</span> {p.office_name ?? '—'} {link(p.office_page_url, 'office page')}</p>
        <p><span className="text-ink-muted">Address:</span> {p.contact_email ?? 'none'} {link(p.contact_email_source_url, 'where it was found')}</p>
        {p.contact_name && <p><span className="text-ink-muted">Named contact:</span> {p.contact_name}</p>}
        {!p.contact_email && <p>{link(p.contact_form_url, 'Contact form')} {p.phone && <span className="ml-2">{p.phone}</span>}</p>}
        <p><span className="text-ink-muted">Confidence:</span> {CONF[p.confidence]}</p>
        {p.notes && <p className="text-ink-muted">{p.notes}</p>}
      </div>

      <div className="mt-4">
        <UniversityEditor
          id={p.id}
          name={p.name}
          status={p.status}
          subject={p.subject ?? ''}
          body={p.body ?? ''}
          contactEmail={p.contact_email ?? ''}
          fromDisplay={formatFrom(settings.from_name, settings.from_email)}
          replyTo={settings.reply_to}
          approvalCurrent={p.status === 'approved' && !!p.approval_hash && p.approval_hash === approvalHash(env)}
          senderProblem={problems[0] ?? null}
          sendingEnabled={process.env.UNIVERSITY_OUTREACH_ENABLED === 'true'}
          sent={p.sent_snapshot}
          replyNote={p.reply_note ?? ''}
        />
      </div>

      {p.status === 'sent' && (
        <div className="mt-4">
          <FollowupEditor
            id={p.id}
            name={p.name}
            state={followupState({ followup_subject: p.followup_subject ?? null, followup_approval_hash: p.followup_approval_hash ?? null, followup_sent_at: p.followup_sent_at ?? null })}
            subject={p.followup_subject ?? ''}
            body={p.followup_body ?? ''}
            to={p.contact_email ?? ''}
            fromDisplay={formatFrom(settings.from_name, settings.from_email)}
            replyTo={settings.reply_to}
            approvalCurrent={!!p.followup_approval_hash && p.followup_approval_hash === followupApprovalHash(followupEnvelope(p, settings))}
            senderProblem={problems[0] ?? null}
            sendingEnabled={process.env.UNIVERSITY_OUTREACH_ENABLED === 'true'}
            daysSince={daysSince(p.sent_at, new Date()) ?? 0}
            minDays={FOLLOWUP_MIN_DAYS}
            sent={p.followup_snapshot ?? null}
          />
        </div>
      )}
    </div>
  )
}
