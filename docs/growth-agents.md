# Growth agents

Three scripts that find sublets posted on public boards, prepare a claimable
draft, and tell the person once that it exists.

```
discover  →  sourced_leads          (what we found; never published)
draft     →  listing_import_requests (pending, claimable — the existing claim flow)
outreach  →  one email, ever         (with a working opt-out)
```

Run them in that order. Each is dry-run by default.

**From the admin console** — `/admin/agents` (admin accounts only). Each step
has a **Preview** button (dry run, changes nothing) and a **Run** button. It
shows the lead queue, counts by status, and how many people have opted out.

**From the terminal** — same logic, same switches:

```bash
AGENT_SOURCES=cmb-resident-sublets npm run agents:discover -- --write
npm run agents:draft -- --write
OUTREACH_ENABLED=true npm run agents:outreach -- --send
```

Both entry points call the one implementation in `src/lib/agents/runner.ts`,
so they cannot drift apart. The console goes through `/api/admin/agents`,
which re-verifies the requester is an admin server-side before the service
role does anything.

## The rules, and where they are enforced

These are enforced in code and schema rather than left to the operator:

| Rule | Enforced by |
|---|---|
| A discovered listing is **never published** | `draft.mjs` writes a *pending* `listing_import_requests` row; only claiming it at `/claim-listing/<token>` can make it live |
| We never copy anyone's **photos** | adapters return facts + a link; `sourced_leads` has no image columns, asserted by a test |
| Nobody is discovered twice | unique index on `(source, source_external_id)` |
| Nobody is emailed twice, ever | `planOutreach` checks `outreach_sent_at`, plus a per-batch dedupe |
| Opt-outs are permanent | `outreach_suppressions` is a separate table, so deleting or re-discovering a lead cannot resurrect an address |
| A daily ceiling | `OUTREACH_DAILY_CAP` (default 25), counted over a rolling 24h |
| Third-party data is not public | both tables are RLS-on with **zero policies** — service role only, same as `listing_import_requests` |

`src/lib/agents/outreach-policy.ts` is pure and unit-tested. The send script
does not decide who may be contacted; it asks that module. Every rule above has
a test whose failure means mailing someone we promised not to mail.

## Two switches before anything sends

Nothing scrapes until a source is named in `AGENT_SOURCES`, and nothing sends
without **both** `--send` and `OUTREACH_ENABLED=true`. A stray cron line or a
copy-pasted command cannot start mailing strangers on its own.

## Env

| Variable | Purpose |
|---|---|
| `AGENT_SOURCES` | Comma-separated adapter keys to run. Empty = fetch nothing. |
| `OUTREACH_ENABLED` | Must be `true` to send. |
| `OUTREACH_DAILY_CAP` | Default 25. |
| `OUTREACH_SECRET` | 32+ random chars. Signs unsubscribe links — **required**, the send will throw without it. Set it in `.env.local` **and** in Vercel: the console runs on the server, and the unsubscribe endpoint verifies with it. |
| `AGENT_DRAFT_LIMIT` | Drafts per run, default 25. |

## Adding a source

Implement `SourceAdapter` (`src/lib/agents/source-adapter.ts`) under
`src/lib/agents/sources/` and add it to `SOURCES` in `runner.ts` — it then
appears in both the console and `AGENT_SOURCES`. Two things to get right:

- **`contactBasis`** — one sentence on why contacting people from this source is
  legitimate. It is stored with the data so the justification travels with it,
  and the console shows it next to the source's checkbox.
- **Split parse from fetch.** Export a pure parser and test it against a
  *synthetic* fixture, as `cmb-resident-sublets.ts` does. The test suite should
  never need real people's contact details to prove parsing works.

Only sources where **posting is itself an invitation to be contacted** qualify.
That was a deliberate scoping decision (2026-09-18) and it is the reason the
outreach email can honestly say "we saw your post".

A source can also be **discovery-only**: if a board gates or meters contact
details, the adapter records the listing and links to it but returns no
`contactEmail`, so the outreach agent skips those leads as `no-contact-email`.
`offcampus-universe` works this way — see below.

## Sources

| Key | What it yields |
|---|---|
| `cmb-resident-sublets` | Residents' posts on CMB's board. Emails **are** printed on the page by the residents themselves, so leads carry a contact and can be emailed. |
| `offcampus-universe-umich` | U-M **sublets only** from offcampus-universe.com, via its sitemap (131 U-M listings; lease type read from each page's own `<meta description>`). **Discovery-only — no emails.** That board hides the lister's address behind a "Show" click and counts those clicks (`showEmailClicks`), so taking it would mean working around the operator's gate. Leads arrive with a link; contact happens through the site. |

## Known gaps

- **No DMCA agent registered.** Deliberate, but it means there is no §512 safe
  harbour. Keeping drafts unpublished and photos uncopied is what keeps this
  clear of that; do not relax either without revisiting.
- **Bounces and complaints are not fed back.** `outreach_suppressions` supports
  `bounced`/`complaint` reasons but nothing writes them yet — wire a Resend
  webhook before volume grows.
- **No per-lead actions in the console yet** (e.g. manually skip a lead). The
  queue is read-only; `/admin/import-review` covers the drafts themselves.
