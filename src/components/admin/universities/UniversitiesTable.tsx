'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, ExternalLink, Loader2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EMPTY_PROSPECT_FILTERS,
  contactKindOf,
  effectiveSelection,
  filterProspects,
  isSelectable,
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
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'approve-selected' | 'withdraw-selected' | null>(null)

  const countries = useMemo(() => [...new Set(rows.map(r => r.country).filter((c): c is string => !!c))].sort(), [rows])
  const units = useMemo(() => [...new Set(rows.flatMap(r => r.umich_units))].sort(), [rows])
  const visible = useMemo(
    () => sortProspects(filterProspects(rows, filters), sort.key, sort.dir) as TableRow[],
    [rows, filters, sort],
  )
  const selectableVisible = visible.filter(isSelectable)
  // Only what is ticked AND still on screen — a row hidden by a filter after
  // being ticked is never acted on.
  const chosen = effectiveSelection(visible, selected)
  const chosenRows = visible.filter(r => chosen.includes(r.id))
  const toApprove = chosenRows.filter(r => r.status === 'drafted').map(r => r.id)
  const toWithdraw = chosenRows.filter(r => r.status === 'approved').map(r => r.id)
  const allTicked = selectableVisible.length > 0 && selectableVisible.every(r => selected.has(r.id))
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_PROSPECT_FILTERS)
  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => {
      const n = new Set(prev)
      if (allTicked) for (const r of selectableVisible) n.delete(r.id)
      else for (const r of selectableVisible) n.add(r.id)
      return n
    })
  }
  async function run(action: 'approve-selected' | 'withdraw-selected', ids: string[]) {
    if (ids.length === 0) return
    setBusy(action)
    try {
      const res = await fetch('/api/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Failed.')
      toast.success(action === 'approve-selected' ? `Approved ${data.approved}. Nothing was sent.` : `Withdrew approval from ${data.withdrawn}.`)
      setSelected(new Set())
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(null)
    }
  }
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

      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-navy-soft/40 px-4 py-2.5" role="region" aria-label="Selected universities">
          <p className="text-[13px] text-ink tabular-nums"><strong>{chosen.length}</strong> selected</p>
          <Button size="sm" disabled={busy !== null || toApprove.length === 0} onClick={() => run('approve-selected', toApprove)}>
            {busy === 'approve-selected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check data-icon="inline-start" />} Approve {toApprove.length}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null || toWithdraw.length === 0} onClick={() => run('withdraw-selected', toWithdraw)}>
            {busy === 'withdraw-selected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 data-icon="inline-start" />} Withdraw approval ({toWithdraw.length})
          </Button>
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setSelected(new Set())}>Clear</Button>
          <p className="ml-auto text-[12px] text-ink-muted">Approving sends nothing. Send happens separately.</p>
        </div>
      )}

      <div className="overflow-auto max-h-[75vh] rounded-3xl border border-line bg-surface shadow-1">
        <table className="w-full text-left text-[13px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-navy-soft text-ink-muted text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 border-b border-line w-8">
                <input type="checkbox" aria-label="Select all shown that can be approved" className="accent-navy-deep" checked={allTicked} disabled={selectableVisible.length === 0} onChange={toggleAll} />
              </th>
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
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-ink-muted">No universities match these filters.</td></tr>
            )}
            {visible.map((r, i) => (
              <tr key={r.id} className={`align-top ${selected.has(r.id) && isSelectable(r) ? 'bg-maize-bright/10' : i % 2 ? 'bg-navy-soft/20' : ''}`}>
                <td className="px-3 py-2 border-b border-line/60">
                  <input type="checkbox" aria-label={`Select ${r.name}`} className="accent-navy-deep" checked={selected.has(r.id) && isSelectable(r)} disabled={!isSelectable(r)} onChange={() => toggle(r.id)} />
                </td>
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
