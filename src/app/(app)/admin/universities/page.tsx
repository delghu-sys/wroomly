import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/brand/EmptyState'
import { UniversitiesTable, type TableRow } from '@/components/admin/universities/UniversitiesTable'
import { UniversitiesConsole } from '@/components/admin/universities/UniversitiesConsole'
import { PartnerSettings } from '@/components/admin/universities/PartnerSettings'
import { countSentLastDay, loadSettings } from '@/lib/universities/runner'
import { formatFrom } from '@/lib/universities/gate'

export const metadata: Metadata = {
  title: 'Admin: Partner universities',
  robots: { index: false, follow: false },
}

export default async function AdminUniversitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: me } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const service = createServiceClient()
  const [res, settings] = await Promise.all([
    service
      .from('university_prospects')
      .select('id, name, country, umich_units, office_name, contact_email, contact_form_url, contact_name, evidence_url, confidence, status, sent_at')
      .order('name'),
    loadSettings(service),
  ])
  // PostgREST says PGRST205 for a table that does not exist yet; 42P01 is the
  // raw Postgres code. Accept both, or a missing migration looks like an
  // empty list.
  const missingTable = res.error?.code === 'PGRST205' || res.error?.code === '42P01'
  const rows = (res.data ?? []) as TableRow[]

  const count = (s: string) => rows.filter(r => r.status === s).length
  const withEmail = rows.filter(r => r.contact_email).length
  const sentToday = await countSentLastDay(service)
  const tiles = [
    { label: 'Universities', value: rows.length },
    { label: 'With an email', value: withEmail },
    { label: 'Drafted', value: count('drafted') },
    { label: 'Approved', value: count('approved') },
    { label: 'Sent', value: count('sent') + count('replied') + count('declined') },
    { label: 'Replied', value: count('replied') },
  ]
  const sample = rows.find(r => r.contact_email && r.umich_units.length) ?? rows[0]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <div className="flex items-start gap-4 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5" strokeWidth={1.75} /></div>
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Partner universities</h1>
          <p className="text-ink-muted mt-1 max-w-2xl">
            The exchange offices at universities that send students to Michigan. Each email is drafted for you, then you read, approve and send it. Nothing goes out without your approval of the exact message.
          </p>
        </div>
      </div>

      {missingTable ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-8 text-[15px] text-ink-soft leading-relaxed">
          <p className="font-medium text-ink mb-1">Migration 044 hasn&rsquo;t been applied yet.</p>
          <p>Paste <code className="font-mono text-[13px]">supabase/migrations/044_university_outreach.sql</code> into the Supabase SQL editor, then run <code className="font-mono text-[13px]">npm run universities:import -- --write</code>.</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No universities yet" description="Run npm run universities:import -- --write to load the researched list." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-8">
            {tiles.map(t => (
              <div key={t.label} className="bg-surface border border-line rounded-3xl p-5 shadow-1">
                <p className="font-display text-3xl tracking-tight text-ink tabular-nums">{t.value}</p>
                <p className="text-[13px] text-ink-muted mt-1.5">{t.label}</p>
              </div>
            ))}
          </div>
          <UniversitiesConsole
            researched={rows.filter(r => r.status === 'researched' && r.contact_email).length}
            approved={count('approved')}
            fromDisplay={formatFrom(settings.from_name, settings.from_email)}
            replyTo={settings.reply_to}
            enabled={process.env.UNIVERSITY_OUTREACH_ENABLED === 'true'}
            dailyCap={settings.daily_cap}
            sentToday={sentToday}
          />
          <section className="mt-8">
            <PartnerSettings
              initial={{ from_name: settings.from_name, from_email: settings.from_email, reply_to: settings.reply_to, daily_cap: settings.daily_cap, subject: settings.subject, body: settings.body }}
              sample={{ name: sample.name, country: sample.country, umich_units: sample.umich_units, office_name: sample.office_name, contact_name: null }}
            />
          </section>
          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight text-ink mb-1">Universities</h2>
            <p className="text-[13.5px] text-ink-muted mb-4">Click a name to read its email, approve it and send it.</p>
            <UniversitiesTable rows={rows} />
          </section>
        </>
      )}
    </div>
  )
}
