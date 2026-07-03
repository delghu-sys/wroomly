// Weekly liquidity dashboard — the 10-minute review from docs/marketing-plan.md §13.
//
//   npm run metrics          → last 7 days + cumulative
//   npm run metrics -- 30    → last 30 days + cumulative
//
// North star: confirmed matches = listings closed via close-deal
// (listings.closed_at, migration 025). Leading indicator: accepted inquiries.
// Liquidity ratio: of listings ≥14 days old, % that got their first inquiry
// within 14 days of going live.
//
// Uses the service role (reads cross-user rows + auth admin API); .env.local
// via node --env-file, same pattern as test-rls-self-promote.mjs.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const db = createClient(URL, SVC, { auth: { persistSession: false } })

const windowDays = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 7
const since = new Date(Date.now() - windowDays * 86400_000).toISOString()
const DAY_MS = 86400_000

function bySource(rows, key = 'source') {
  const counts = {}
  for (const r of rows) {
    const s = r[key] ?? '(direct/unknown)'
    counts[s] = (counts[s] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s}: ${n}`)
    .join('  ·  ') || '—'
}

async function all(table, columns, filter) {
  // Paginate so counts stay exact past 1k rows.
  const rows = []
  for (let fromIdx = 0; ; fromIdx += 1000) {
    let q = db.from(table).select(columns).range(fromIdx, fromIdx + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function authUserCount() {
  let total = 0
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth.listUsers: ${error.message}`)
    total += data.users.length
    if (data.users.length < 1000) return total
  }
}

// users.signup_source lands with migration 030 — fall back gracefully so the
// dashboard still runs if the migration hasn't been pasted yet.
async function allUsers() {
  try {
    return await all('users', 'id, created_at, user_type, signup_source')
  } catch (e) {
    if (!String(e.message).includes('signup_source')) throw e
    console.warn('⚠ users.signup_source missing — apply migration 030 for signups-by-source\n')
    return await all('users', 'id, created_at, user_type')
  }
}

// analytics_events lands with migration 031 — treat as optional.
async function allEvents() {
  try {
    return await all('analytics_events', 'id, name, created_at')
  } catch {
    console.warn('⚠ analytics_events missing — apply migration 031 for the funnel section\n')
    return []
  }
}

const [users, listings, inquiries, waitlist, alerts, authTotal, events] = await Promise.all([
  allUsers(),
  all('listings', 'id, created_at, status, closed_at, supplier_id'),
  all('inquiries', 'id, created_at, status, listing_id'),
  all('renter_waitlist', 'id, created_at, source'),
  all('match_alerts', 'id, created_at, status, source'),
  authUserCount(),
  allEvents(),
])

const inWindow = r => r.created_at >= since
const sourceOfUser = new Map(users.map(u => [u.id, u.signup_source ?? '(direct/unknown)']))

// ── Supply ──
const published = listings.filter(l => l.status !== 'draft' && l.status !== 'pending_review')
const active = listings.filter(l => l.status === 'active')
const matches = listings.filter(l => l.closed_at)
const matchesInWindow = listings.filter(l => l.closed_at && l.closed_at >= since)
const listingsBySource = published.map(l => ({ source: sourceOfUser.get(l.supplier_id) }))

// ── Demand ──
const accepted = inquiries.filter(i => i.status === 'accepted')
const activeAlerts = alerts.filter(a => a.status === 'active')

// ── Liquidity ratio + time-to-first-inquiry ──
const firstInquiryAt = new Map()
for (const i of inquiries) {
  const prev = firstInquiryAt.get(i.listing_id)
  if (!prev || i.created_at < prev) firstInquiryAt.set(i.listing_id, i.created_at)
}
const matured = published.filter(l => Date.now() - new Date(l.created_at) >= 14 * DAY_MS)
const maturedWithFast = matured.filter(l => {
  const f = firstInquiryAt.get(l.id)
  return f && new Date(f) - new Date(l.created_at) <= 14 * DAY_MS
})
const daysToFirst = published
  .map(l => {
    const f = firstInquiryAt.get(l.id)
    return f ? (new Date(f) - new Date(l.created_at)) / DAY_MS : null
  })
  .filter(d => d !== null)
  .sort((a, b) => a - b)
const medianDtF = daysToFirst.length
  ? daysToFirst[Math.floor(daysToFirst.length / 2)].toFixed(1)
  : '—'

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—')

// ── Funnel events (migration 031) ──
const evCount = name => events.filter(e => e.name === name && inWindow(e)).length
const funnelLine = events.length
  ? [
      `import: started ${evCount('import_started')} → uploaded ${evCount('import_upload_done')} → succeeded ${evCount('import_succeeded')} (failed ${evCount('import_failed')})`,
      `    claim: viewed ${evCount('claim_viewed')} → publish attempted ${evCount('publish_attempted')} → succeeded ${evCount('publish_succeeded')} (failed ${evCount('publish_failed')})`,
      `    inquiries sent (client event): ${evCount('inquiry_sent')}`,
    ].join('\n')
  : '(no events yet — apply migration 031 + deploy)'

console.log(`
WROOMLY LIQUIDITY DASHBOARD — ${new Date().toISOString().slice(0, 10)}  (window: last ${windowDays}d)
${'─'.repeat(72)}
★ MATCHES (north star — deals closed)
    window: ${matchesInWindow.length}    cumulative: ${matches.length}

SUPPLY
    listings published:  window ${published.filter(inWindow).length} · total ${published.length} (active now: ${active.length})
    by source:           ${bySource(listingsBySource)}
    liquidity ratio:     ${pct(maturedWithFast.length, matured.length)} of listings ≥14d old got an inquiry ≤14d (${maturedWithFast.length}/${matured.length})
    median days → first inquiry: ${medianDtF}

DEMAND
    inquiries sent:      window ${inquiries.filter(inWindow).length} · total ${inquiries.length}
    accepted (contact exchanged): total ${accepted.length} (${pct(accepted.length, inquiries.length)} accept rate)
    waitlist:            window ${waitlist.filter(inWindow).length} · total ${waitlist.length}
      by source:         ${bySource(waitlist)}
    match alerts:        window ${alerts.filter(inWindow).length} · total ${alerts.length} (active: ${activeAlerts.length})
      by source:         ${bySource(alerts)}

FUNNEL (window)
    ${funnelLine}

ACCOUNTS
    signups (verified):  window ${users.filter(inWindow).length} · total ${users.length}
      by source:         ${bySource(users, 'signup_source')}
      suppliers/consumers: ${users.filter(u => u.user_type === 'supplier').length}/${users.filter(u => u.user_type === 'consumer').length}
    verification completion: ${pct(users.length, authTotal)} (${users.length}/${authTotal} auth accounts finished email confirm)
${'─'.repeat(72)}`)
