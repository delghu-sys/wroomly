'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, ExternalLink, SquarePen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EMPTY_FILTERS,
  filterLeads,
  leadsToCsv,
  sortLeads,
  type LeadFilters,
  type LeadStatus,
  type LeadTableRow,
  type SortDir,
  type SortKey,
} from '@/lib/agents/leads-table'

interface Props {
  rows: LeadTableRow[]
  sources: { key: string; label: string }[]
}

const STATUS_TONES: Record<LeadStatus, string> = {
  new: 'text-ink-soft border-line bg-surface',
  drafted: 'text-[oklch(0.50_0.15_75)] border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)]',
  contacted: 'text-[oklch(0.40_0.13_142)] border-[oklch(0.85_0.10_142)] bg-[oklch(0.97_0.04_142)]',
  skipped: 'text-ink-muted border-line bg-surface',
}

const TERM_TONES = {
  current: 'text-[oklch(0.40_0.13_142)]',
  ended: 'text-red-700',
  unknown: 'text-ink-muted',
} as const

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Listing', className: 'min-w-[16rem]' },
  { key: 'price', label: 'Rent', className: 'text-right' },
  { key: 'dates', label: 'Dates', className: 'min-w-[11rem]' },
  { key: 'contact', label: 'Contact', className: 'min-w-[12rem]' },
  { key: 'source', label: 'Source' },
  { key: 'postedOn', label: 'Posted' },
  { key: 'foundOn', label: 'Found' },
  { key: 'emailedOn', label: 'Emailed' },
]

const selectClass =
  'h-8 rounded-lg border border-input bg-surface px-2 text-[13px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/**
 * Every lead ever recorded, as a spreadsheet: filter by source, status,
 * contact, emailed-or-not and whether the dates are still current; click a
 * column to sort; export exactly what is on screen as CSV. All of the logic
 * lives in src/lib/agents/leads-table.ts and is unit-tested — this file only
 * draws it.
 */
export function LeadsTable({ rows, sources }: Props) {
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'foundOn', dir: 'desc' })

  const visible = useMemo(() => sortLeads(filterLeads(rows, filters), sort.key, sort.dir), [rows, filters, sort])
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const sourceLabel = (key: string) => sources.find(s => s.key === key)?.label ?? key

  function set<K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function toggleSort(key: SortKey) {
    setSort(s =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : // Dates and prices read best newest/priciest first; text A→Z.
          { key, dir: ['postedOn', 'foundOn', 'emailedOn', 'price'].includes(key) ? 'desc' : 'asc' },
    )
  }

  function exportCsv() {
    const blob = new Blob([leadsToCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wroomly-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="Search listing, contact, dates, reason…"
          aria-label="Search leads"
          className="w-full sm:w-64 bg-surface text-[13px]"
        />
        <select aria-label="Source" className={selectClass} value={filters.source} onChange={e => set('source', e.target.value)}>
          <option value="all">All sources</option>
          {sources.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select aria-label="Status" className={selectClass} value={filters.status} onChange={e => set('status', e.target.value as LeadFilters['status'])}>
          <option value="all">Any status</option>
          <option value="new">New</option>
          <option value="drafted">Drafted</option>
          <option value="contacted">Contacted</option>
          <option value="skipped">Skipped</option>
        </select>
        <select aria-label="Contact" className={selectClass} value={filters.contact} onChange={e => set('contact', e.target.value as LeadFilters['contact'])}>
          <option value="all">Any contact</option>
          <option value="email">Has email</option>
          <option value="handle">Handle only (manual)</option>
          <option value="none">No contact</option>
        </select>
        <select aria-label="Emailed" className={selectClass} value={filters.emailed} onChange={e => set('emailed', e.target.value as LeadFilters['emailed'])}>
          <option value="all">Emailed or not</option>
          <option value="yes">Emailed</option>
          <option value="no">Not emailed</option>
        </select>
        <select aria-label="Dates" className={selectClass} value={filters.term} onChange={e => set('term', e.target.value as LeadFilters['term'])}>
          <option value="all">Any dates</option>
          <option value="current">Dates current</option>
          <option value="ended">Dates ended</option>
          <option value="unknown">Dates unknown</option>
        </select>
        {filtering && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X data-icon="inline-start" /> Clear
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <p className="text-[13px] text-ink-muted tabular-nums">
            {visible.length === rows.length ? `${rows.length} leads` : `${visible.length} of ${rows.length} leads`}
          </p>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={visible.length === 0}>
            <Download data-icon="inline-start" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-auto max-h-[75vh] rounded-3xl border border-line bg-surface shadow-1">
        <table className="w-full text-left text-[13px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-navy-soft text-ink-muted text-[11px] uppercase tracking-wide">
            <tr>
              {COLUMNS.map(c => {
                const active = sort.key === c.key
                const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-3 py-2.5 font-medium border-b border-line whitespace-nowrap ${c.className ?? ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}
                    >
                      {c.label}
                      <Icon className={`w-3 h-3 ${active ? '' : 'opacity-50'}`} />
                    </button>
                  </th>
                )
              })}
              <th className="px-3 py-2.5 font-medium border-b border-line">Note</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-ink-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {visible.map((l, i) => (
              <tr key={l.id} className={`align-top ${i % 2 ? 'bg-navy-soft/20' : ''}`}>
                <td className="px-3 py-2 border-b border-line/60">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${STATUS_TONES[l.status]}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink max-w-[22rem]">
                  {l.draftId ? (
                    <Link href={`/admin/agents/${l.draftId}`} className="group/draft inline-flex items-start gap-1.5 text-navy hover:text-ink">
                      <span className="underline underline-offset-2 line-clamp-2" title={l.title}>{l.title}</span>
                      <SquarePen className="w-3.5 h-3.5 mt-0.5 text-ink-muted group-hover/draft:text-ink shrink-0" />
                    </Link>
                  ) : (
                    <span className="line-clamp-2" title={l.title}>{l.title}</span>
                  )}
                  {l.boardStatus && <p className="text-[11px] text-ink-muted mt-0.5">Board: {l.boardStatus}</p>}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-right tabular-nums whitespace-nowrap">
                  {l.priceNumber ? `$${l.priceNumber.toLocaleString('en-US')}` : (l.price ?? <span className="text-ink-muted">—</span>)}
                </td>
                <td className="px-3 py-2 border-b border-line/60">
                  {l.dates ? (
                    <>
                      <span className="text-ink-soft">{l.dates}</span>
                      <p className={`text-[11px] ${TERM_TONES[l.termState]}`}>{l.termState}</p>
                    </>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-soft">
                  {l.contactEmail ? (
                    <span className="break-all">{l.contactEmail}</span>
                  ) : l.contactHandle ? (
                    <a href={l.contactUrl ?? l.sourceUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink">
                      {l.contactHandle} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-ink-muted">none published</span>
                  )}
                  {l.contactName && l.contactName !== l.contactHandle && (
                    <p className="text-[11px] text-ink-muted">{l.contactName}</p>
                  )}
                  {l.contactKind === 'handle' && <p className="text-[11px] text-ink-muted">manual message</p>}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-soft whitespace-nowrap">
                  {l.sourceUrl ? (
                    <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink" title={l.source}>
                      {sourceLabel(l.source)} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    sourceLabel(l.source)
                  )}
                </td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-muted tabular-nums whitespace-nowrap">{l.postedOn ?? '—'}</td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-muted tabular-nums whitespace-nowrap">{l.foundOn}</td>
                <td className="px-3 py-2 border-b border-line/60 text-ink-muted tabular-nums whitespace-nowrap">{l.emailedOn ?? '—'}</td>
                <td className="px-3 py-2 border-b border-line/60 text-[11.5px] text-ink-muted max-w-[16rem]">{l.skipReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
