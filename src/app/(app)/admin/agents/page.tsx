import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ArrowLeft, Bot } from 'lucide-react'
import { EmptyState } from '@/components/brand/EmptyState'
import { AgentsConsole } from '@/components/admin/AgentsConsole'
import { LeadsTable } from '@/components/admin/LeadsTable'
import { toLeadTableRow, type LeadDbRow } from '@/lib/agents/leads-table'
import { EmailTemplateEditor } from '@/components/admin/EmailTemplateEditor'
import { SOURCES, loadActiveSummary } from '@/lib/agents/runner'
import { ActiveSubletsCard } from '@/components/admin/ActiveSubletsCard'
import { DEFAULT_TEMPLATE, type OutreachTemplate } from '@/lib/agents/outreach-template'

export const metadata: Metadata = {
  title: 'Admin: Growth agents',
  robots: { index: false, follow: false },
}

export default async function AdminAgentsPage() {
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

  // Both tables are service-role only (RLS-on, zero policies) — this is the
  // one place they are read for a human.
  const service = createServiceClient()
  const [leadsRes, supsRes, templateRes, activeSummary] = await Promise.all([
    service
      .from('sourced_leads')
      .select(
        'id, status, skip_reason, title, contact_email, source, source_url, discovered_at, outreach_sent_at, import_request_id, extracted',
      )
      .order('discovered_at', { ascending: false })
      .limit(2000),
    service.from('outreach_suppressions').select('email', { count: 'exact', head: true }),
    service.from('outreach_template').select('subject, body').eq('id', 'default').maybeSingle(),
    // From stored data only (no network), so it is cheap on every page load.
    // A failure here must never take the whole console down with it.
    loadActiveSummary(service).catch(() => null),
  ])

  // Migration 042 not applied yet → the table doesn't exist. Say so instead
  // of rendering an empty console that silently can't work.
  const missingTable = leadsRes.error?.code === '42P01'
  const leads = (leadsRes.data ?? []) as LeadDbRow[]
  const counts = { new: 0, drafted: 0, contacted: 0, skipped: 0 }
  for (const l of leads) counts[l.status] += 1
  const optedOut = supsRes.count ?? 0

  // Migration 043 (outreach_template) is separate and optional to the rest of
  // this page — falls back to the built-in default rather than blocking
  // everything else, same fallback loadOutreachTemplate() uses at send time.
  const missingTemplateTable = templateRes.error?.code === '42P01'
  const template = (templateRes.data as OutreachTemplate | null) ?? DEFAULT_TEMPLATE

  const tiles = [
    { label: 'New leads', value: counts.new },
    { label: 'Drafted', value: counts.drafted },
    { label: 'Contacted', value: counts.contacted },
    { label: 'Skipped', value: counts.skipped },
    { label: 'Opted out', value: optedOut },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Growth agents</h1>
          <p className="text-ink-muted mt-1 max-w-2xl">
            Find sublets on boards that invite contact, prepare a claimable draft, and tell the person once. Nothing
            here publishes a listing — only the owner can, by claiming it. Once a lead is drafted, click its title in
            the table below to view and edit it.
          </p>
        </div>
      </div>

      {missingTable ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-8 text-[15px] text-ink-soft leading-relaxed">
          <p className="font-medium text-ink mb-1">Migration 042 hasn&rsquo;t been applied yet.</p>
          <p>
            Paste <code className="font-mono text-[13px]">supabase/migrations/042_growth_agents.sql</code> into the
            Supabase SQL editor. This page and the agents will work as soon as it runs.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {tiles.map(({ label, value }) => (
              <div key={label} className="bg-surface border border-line rounded-3xl p-5 shadow-1">
                <p className="font-display text-3xl tracking-tight text-ink tabular-nums">{value}</p>
                <p className="text-[13px] text-ink-muted mt-1.5">{label}</p>
              </div>
            ))}
          </div>

          {activeSummary && <ActiveSubletsCard initial={activeSummary} />}

          <AgentsConsole
            sources={SOURCES.map(s => ({ key: s.key, label: s.label, contactBasis: s.contactBasis }))}
          />

          <section className="mt-8">
            {missingTemplateTable ? (
              <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-6 text-[14px] text-ink-soft leading-relaxed">
                <p className="font-medium text-ink mb-1">Migration 043 hasn&rsquo;t been applied yet.</p>
                <p>
                  Paste <code className="font-mono text-[13px]">supabase/migrations/043_outreach_template.sql</code>{' '}
                  to edit the outreach email here. It sends the built-in default until then.
                </p>
              </div>
            ) : (
              <EmailTemplateEditor initial={template} />
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight text-ink mb-1">Leads</h2>
            <p className="text-[13.5px] text-ink-muted mb-4">
              Everyone found, with or without a contact. Filter, sort by any column, or export what is shown.
            </p>
            {leads.length === 0 ? (
              <EmptyState
                title="Nothing discovered yet"
                description="Run discovery above. A dry run shows what it would find without saving anything."
              />
            ) : (
              <LeadsTable
                rows={leads.map(l => toLeadTableRow(l))}
                sources={SOURCES.map(s => ({ key: s.key, label: s.label }))}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
