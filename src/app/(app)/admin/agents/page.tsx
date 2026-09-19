import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Bot, ExternalLink, SquarePen } from 'lucide-react'
import { EmptyState } from '@/components/brand/EmptyState'
import { AgentsConsole } from '@/components/admin/AgentsConsole'
import { EmailTemplateEditor } from '@/components/admin/EmailTemplateEditor'
import { SOURCES } from '@/lib/agents/runner'
import { DEFAULT_TEMPLATE, type OutreachTemplate } from '@/lib/agents/outreach-template'

export const metadata: Metadata = {
  title: 'Admin: Growth agents',
  robots: { index: false, follow: false },
}

interface LeadRow {
  id: string
  status: 'new' | 'drafted' | 'contacted' | 'skipped'
  skip_reason: string | null
  title: string | null
  contact_email: string | null
  source: string
  source_url: string | null
  discovered_at: string
  outreach_sent_at: string | null
  import_request_id: string | null
}

const STATUS_TONES: Record<LeadRow['status'], string> = {
  new: 'text-ink-soft border-line bg-surface',
  drafted: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  contacted: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
  skipped: 'text-ink-muted border-line bg-surface',
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
  const [leadsRes, supsRes, templateRes] = await Promise.all([
    service
      .from('sourced_leads')
      .select(
        'id, status, skip_reason, title, contact_email, source, source_url, discovered_at, outreach_sent_at, import_request_id',
      )
      .order('discovered_at', { ascending: false })
      .limit(200),
    service.from('outreach_suppressions').select('email', { count: 'exact', head: true }),
    service.from('outreach_template').select('subject, body').eq('id', 'default').maybeSingle(),
  ])

  // Migration 042 not applied yet → the table doesn't exist. Say so instead
  // of rendering an empty console that silently can't work.
  const missingTable = leadsRes.error?.code === '42P01'
  const leads = (leadsRes.data ?? []) as LeadRow[]
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
            <h2 className="font-display text-xl tracking-tight text-ink mb-4">Leads</h2>
            {leads.length === 0 ? (
              <EmptyState
                title="Nothing discovered yet"
                description="Run discovery above. A dry run shows what it would find without saving anything."
              />
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-1">
                <table className="w-full text-left text-[14px]">
                  <thead className="bg-navy-soft/40 text-ink-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Listing</th>
                      <th className="px-5 py-3 font-medium">Contact</th>
                      <th className="px-5 py-3 font-medium">Source</th>
                      <th className="px-5 py-3 font-medium">Found</th>
                      <th className="px-5 py-3 font-medium">Emailed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} className="border-t border-line align-top">
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_TONES[l.status]}`}
                          >
                            {l.status}
                          </span>
                          {l.skip_reason && (
                            <p className="text-[11px] text-ink-muted mt-1">{l.skip_reason}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink">
                          {l.import_request_id ? (
                            <Link
                              href={`/admin/agents/${l.id}`}
                              className="group/draft inline-flex items-center gap-1.5 text-navy hover:text-ink"
                            >
                              <span className="underline underline-offset-2">{l.title ?? 'Untitled'}</span>
                              <SquarePen className="w-3.5 h-3.5 text-ink-muted group-hover/draft:text-ink shrink-0" />
                            </Link>
                          ) : (
                            l.title ?? '—'
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-soft">{l.contact_email ?? <span className="text-ink-muted">none published</span>}</td>
                        <td className="px-5 py-3 text-ink-soft">
                          {l.source_url ? (
                            <a
                              href={l.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:text-ink underline underline-offset-2"
                            >
                              {l.source} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            l.source
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-muted text-xs whitespace-nowrap">
                          {format(parseISO(l.discovered_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 py-3 text-ink-muted text-xs whitespace-nowrap">
                          {l.outreach_sent_at ? format(parseISO(l.outreach_sent_at), 'MMM d, yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
