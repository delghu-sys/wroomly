'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EMPTY_PROSPECT_FILTERS,
  contactKindOf,
  filterProspects,
  sortProspects,
  type ProspectFilters,
  type ProspectRowLite,
  type ProspectSortKey,
} from '@/lib/universities/table'

export interface TableRow extends ProspectRowLite {
  umich_units: string[]
  contact_name: string | null
  evidence_url: string | null
}

const STATUS_TONES: Record<string, string> = {
  researched: 'text-ink-muted border-line bg-surface',
  drafted: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  approved: 'text-[oklch(0.40_0.13_250)] border-[oklch(0.85_0.08_250)] bg-[oklch(0.97_0.03_250)]',
  sent: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
  replied: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.80_0.12_142)] bg-[oklch(0.94_0.07_142)]',
  declined: 'text-red-700 border-red-200 bg-red-50',
  skipped: 'text-ink-muted border-line bg-surface',
}

const CONF_LABEL = { verified: 'verified', likely: 'likely', not_found: 'no address' } as const
const CONF_TONE = { verified: 'text-[oklch(0.40_0.13_142)]', likely: 'text-[oklch(0.50_0.15_75)]', not_found: 'text-ink-muted' } as const

const selectClass =
  'h-8 rounded-lg border border-input bg-surface px-2 text-[13px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function UniversitiesTable({ rows }: { rows: TableRow[] }) {
  const [filters, setFilters] = useState<ProspectFilters>(EMPTY_PROSPECT_FILTERS)
  const [sort, setSort] = useState<{ key: ProspectSortKey; dir: 'asc' | 'desc' }>({ key: 'status', dir: 'asc' })

  const countries = useMemo(() => [...new Set(rows.map(r => r.country).filter((c): c is string => !!c))].sort(), [rows])
  const units = useMemo(() => [...new Set(rows.flatMap(r => r.umich_units))].sort(), [rows])
  const visible = useMemo(
    () => sortProspects(filterProspects(rows, filters), sort.key, sort.dir) as TableRow[],
    [rows, filters, sort],
  )
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_PROSPECT_FILTERS)
  const set = <K extends keyof ProspectFilters>(k: K, v: ProspectFilters[K]) => setFilters(f => ({ ...f, [k]: v }))

  const columns: { key: ProspectSortKey | null; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'name', label: 'University' },
    { key: 'country', label: 'Country' },
    { key: null, label: 'Michigan program' },
    { key: null, label: 'Office / contact' },
    { key: 'confidence', label: 'Address' },
    { key: 'sent_at', label: 'Sent' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="search" value={filters.search} onChange={e => set('search', e.target.value)} placeholder="Search university, office, email…" aria-label="Search universities" className="w-full sm:w-64 bg-surface text-[13px]" />
        <select aria-label="Country" className={selectClass} value={filters.country} onChange={e => set('country', e.target.value)}>
          <option value="all">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Status" className={selectClass} value={filters.status} onChange={e => set('status', e.target.value as ProspectFilters['status'])}>
          <option value="all">Any status</option>
          {['researched', 'drafted', 'approved', 'sent', 'replied', 'declined', 'skipped'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Contact" className={selectClass} value={filters.contact} onChange={e => set('contact', e.target.value as ProspectFilters['contact'])}>
          <option value="all">Any contact</option>
          <option value="email">Has email</option>
          <option value="form">Contact form only</option>
          <option value="none">Nothing found</option>
        </select>
        <select aria-label="Michigan program" className={selectClass} value={filters.unit} onChange={e => set('unit', e.target.value)}>
          <option value="all">Any program</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {filtering && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_PROSPECT_FILTERS)}>
            <X data-icon="inline-start" /> Clear
          </Button>
        )}
        <p className="ml-auto text-[13px] text-ink-muted tabular-nums">
          {visible.length === rows.length ? `${rows.length} universities` : `${visible.length} of ${rows.length} universities`}
        </p>
      </div>

      <div className="overflow-auto max-h-[75vh] rounded-3xl border border-line bg-surface shadow-1">
        <table className="w-full text-left text-[13px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-navy-soft text-ink-muted text-[11px] uppercase tracking-wide">
            <tr>
              {columns.map(c => {
                const active = c.key !== null && sort.key === c.key
                const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
                return (
                  <th key={c.label} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-3 py-2.5 font-medium border-b border-line whitespace-nowrap">
                    {c.key ? (
                      <button type="button" className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}
                        onClick={() => setSort(s => (s.key === c.key ? { key: c.key!, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key!, dir: 'asc' }))}>
                        {c.label} <Icon className={`w-3 h-3 ${active ? '' : 'opacity-50'}`} />
                      </button>
                    ) : c.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted">No universities match these filters.</td></tr>
            )}
            {visible.map((r, i) => (
              <tr key={r.id} className={`align-top ${i % 2 ? 'bg-navy-soft/20' : ''}`}>
                <td className="px-3 py-2 border-b border-line/60">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${STATUS_TONES[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 border-b border-line/60 min-w-[14rem]">
                  <Link href={`/admin/universities/${r.id}`} className="text-navy underline underline-offset-2 hover:text-ink">{r.name}</Link>
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-soft whitespace-nowrap">{r.country ?? '—'}</td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-soft">
                  {r.umich_units.length ? r.umich_units.join(', ') : <span className="text-ink-muted">—</span>}
                  {r.evidence_url && (
                    <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex align-middle text-ink-muted hover:text-ink" title="Page showing the Michigan partnership" aria-label={`Evidence for ${r.name}`}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-soft min-w-[14rem]">
                  {r.office_name && <p className="text-ink">{r.office_name}</p>}
                  {r.contact_email ? <p className="break-all">{r.contact_email}</p>
                    : r.contact_form_url ? <a href={r.contact_form_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">contact form</a>
                    : <span className="text-ink-muted">nothing found</span>}
                  {r.contact_name && <p className="text-[11px] text-ink-muted">{r.contact_name}</p>}
                </td>
                <td className={`px-3 py-2 border-b border-line/60 whitespace-nowrap text-[12px] ${CONF_TONE[r.confidence]}`}>
                  {contactKindOf(r) === 'form' ? 'form only' : CONF_LABEL[r.confidence]}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-muted tabular-nums whitespace-nowrap">{r.sent_at ? r.sent_at.slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
