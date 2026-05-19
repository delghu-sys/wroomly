// Fetch unresolved Sentry issues with full stack-trace context so Claude
// can read them, find the offending code, and open a PR with a fix.
//
// Run with:
//   node --env-file=.env.sentry-build-plugin scripts/sentry-issues.mjs
//
// Optional flags:
//   --limit=N         number of issues to fetch (default 10)
//   --include-event   also fetch the latest event for each issue (slower,
//                     but you get the actual stack trace + breadcrumbs)
//   --json            machine-readable output (default human-readable)

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN
const ORG = 'wroomly'
const PROJECT = 'javascript-nextjs'

if (!SENTRY_AUTH_TOKEN) {
  console.error('SENTRY_AUTH_TOKEN missing. Run with --env-file=.env.sentry-build-plugin')
  process.exit(1)
}

const args = process.argv.slice(2)
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 10)
const includeEvent = args.includes('--include-event')
const asJson = args.includes('--json')

const headers = {
  Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
  'Content-Type': 'application/json',
}

async function sentryGet(path) {
  const res = await fetch(`https://sentry.io/api/0${path}`, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Sentry API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

const issues = await sentryGet(
  `/projects/${ORG}/${PROJECT}/issues/?query=is:unresolved&limit=${limit}`,
)

const enriched = []
for (const issue of issues) {
  const out = {
    id: issue.id,
    short_id: issue.shortId,
    title: issue.title,
    culprit: issue.culprit,
    level: issue.level,
    status: issue.status,
    is_unhandled: issue.isUnhandled,
    times_seen: issue.count,
    users_affected: issue.userCount,
    first_seen: issue.firstSeen,
    last_seen: issue.lastSeen,
    permalink: issue.permalink,
    metadata: issue.metadata,
  }
  if (includeEvent) {
    try {
      const event = await sentryGet(`/issues/${issue.id}/events/latest/`)
      out.event = {
        platform: event.platform,
        tags: event.tags?.slice(0, 20),
        // Just the first exception's frames — that's usually where the bug is
        exception_frames: event.entries
          ?.find(e => e.type === 'exception')
          ?.data?.values?.[0]?.stacktrace?.frames?.slice(-10)
          ?.map(f => ({
            file: f.filename,
            function: f.function,
            line: f.lineNo,
            in_app: f.inApp,
            context: f.context, // [line_no, code_str][]
          })),
        breadcrumbs: event.entries
          ?.find(e => e.type === 'breadcrumbs')
          ?.data?.values?.slice(-5)
          ?.map(b => ({
            category: b.category,
            level: b.level,
            message: b.message,
            timestamp: b.timestamp,
          })),
        request_url: event.entries?.find(e => e.type === 'request')?.data?.url,
      }
    } catch (err) {
      out.event_error = err instanceof Error ? err.message : String(err)
    }
  }
  enriched.push(out)
}

if (asJson) {
  console.log(JSON.stringify(enriched, null, 2))
} else {
  if (enriched.length === 0) {
    console.log('✓ No unresolved Sentry issues. Production is clean.')
  } else {
    console.log(`Found ${enriched.length} unresolved issue${enriched.length === 1 ? '' : 's'}:\n`)
    for (const i of enriched) {
      console.log(`▸ ${i.short_id} [${i.level}] ${i.title}`)
      console.log(`  Seen ${i.times_seen}× by ${i.users_affected} user(s)`)
      console.log(`  Culprit: ${i.culprit ?? '(unknown)'}`)
      console.log(`  First: ${i.first_seen}  Last: ${i.last_seen}`)
      console.log(`  Permalink: ${i.permalink}`)
      if (i.event?.exception_frames?.length) {
        console.log('  Top frames:')
        for (const f of i.event.exception_frames.filter(f => f.in_app).slice(-3)) {
          console.log(`    ${f.file}:${f.line}  ${f.function ?? ''}`)
        }
      }
      console.log()
    }
  }
}
