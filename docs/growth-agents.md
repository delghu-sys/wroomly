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
| A discovered listing is **never published** | `draft.mjs` writes an unpublished `listing_import_requests` row; only the owner, by claiming and publishing at `/claim-listing/<token>`, can make it live |
| Photos stay **private until the owner publishes them** | copied into the PRIVATE `listing-imports` bucket (`source-photos.ts`); reach the public bucket only if the claimer publishes with them selected. *Changed 2026-10-01 — previously never copied at all; see Known gaps.* |
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
| `RESEND_WEBHOOK_SECRET` | `whsec_…`, from the Resend dashboard. Verifies inbound delivery events. Without it `/api/resend/webhook` refuses every request, so bounces and complaints are never recorded. |

## Bounces and complaints

`outreach_suppressions` is checked before every send. Three things write to it:

1. **Unsubscribe** — a recipient clicking the `List-Unsubscribe` link.
2. **Hard bounces** — the address does not exist.
3. **Spam complaints** — the recipient hit "report spam".

The last two arrive as Resend webhooks at `POST /api/resend/webhook`. To turn
them on:

1. Resend dashboard → **Webhooks** → **Add Webhook**
2. Endpoint: `https://wroomly.app/api/resend/webhook`
3. Subscribe to **`email.bounced`** and **`email.complained`** (others are
   accepted and ignored)
4. Copy the signing secret (`whsec_…`) into Vercel as `RESEND_WEBHOOK_SECRET`,
   then redeploy — env vars bind at build time

Every request must carry a valid Svix signature; an unsigned or forged POST is
rejected with a 400 and writes nothing. Without that check, anyone who learned
the URL could forge a bounce and silently suppress any address they liked.

**Transient bounces deliberately do NOT suppress.** A full mailbox or a
greylisting deferral is not a dead address. Only `Permanent` and
`Undetermined` bounces suppress — the rules live in
`src/lib/agents/resend-events.ts` and are unit-tested.

The webhook fires for transactional mail too (inquiries, Match alerts). A hard
bounce there means the same thing, so it suppresses as well; only outreach
consults this table, so nothing user-facing changes.

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

## Sources

| Key | What it yields |
|---|---|
| `cmb-resident-sublets` | Residents' posts on CMB's board. Residents print their own email on the page, so leads carry a contact. |
| `offcampus-universe-umich` | U-M **sublets only** from offcampus-universe.com, via its sitemap (131 U-M listings). Leads carry the poster's email, name, dates and bed/bath. |
| `reddit-sublets` | Sublet **offers** on r/uofm and r/AnnArbor, via Reddit's public Atom search feeds (one request per subreddit per run). Nobody publishes an email there, so these leads carry a Reddit handle + post link for a **manual** message; the draft and outreach agents skip them. "Looking for a sublet" posts are recorded as skipped so the feed is not re-read for them. Expect about one real offer a month on r/uofm. Reddit rate-limits anonymous feeds (HTTP 429) — a run that hits it says so; wait a few minutes. |

| `subleaps-a2` | Active subleases on SubLeaps' Ann Arbor and U-M pages (subleaps.com). One page carries every record, so there is no per-listing fetch: title, description, rent, start and end dates, bedrooms, town, status and the date posted. The "host" is an opaque id. Contact is through the site, so leads are link-only. About 6 active listings at the time of writing. Use the bare `subleaps.com`; the `www.` host was down. |
| `rotatingroom-a2` | Furnished sublets on RotatingRoom's Ann Arbor page, from the schema.org data on each listing (rent, availability window, bedrooms, coordinates). No host name, email or phone. The "Ann Arbor" page also lists nearby towns, so each listing is checked against the service area and the rest are remembered as skipped. About 89 listings across five index pages; a run fetches up to 40 new ones, so the first sweep takes a few runs. |
| `ohana-a2` | Ohana's "A2 Sublets" page (liveohana.ai): rent, availability window, bedrooms and town from each listing's schema.org data. No host name, email or phone. **Ohana's terms prohibit scraping** (see below); registered, but only runs when named in `AGENT_SOURCES` or ticked in the console. |

All three are **link-only**: no email is published, so each lead carries `Message on <site>` plus the listing link, shows as a handle in the leads table, and is skipped by the draft and outreach agents. Nobody is emailed from these sources. An email that a host happens to type into a description is deliberately **not** taken: it was not published as an invitation to be emailed, and these sites route contact through their own messaging.

### Sources that were looked at and ruled out (2026-10-18)

| Site | Why not |
|---|---|
| U-M Off-Campus Housing (offcampushousing.umich.edu) | The student **sublease board is behind U-M single sign-on**; the public part is landlord inventory, not sublets. |
| Facebook groups (UMich Housing, Sublets & Roommates) | Login-only, and automated access is against Facebook's terms. The biggest source, and only reachable by posting there as a person. |
| Craigslist (annarbor.craigslist.org/search/sub) | Its terms forbid scrapers and crawlers outright. Contacts are relay addresses anyway. |
| Uloop, CollegeRentals, Michigan Daily classifieds | 0–4 U-M sublets at the time of checking; contact only through the site's own form. (SubLeaps was added later as `subleaps-a2`.) |
| Other Ann Arbor managers' "sublet boards" (Varsity, CMI, Wilson White, Cabrio, Prime…) | None found — CMB is the only manager that publishes residents' own posts. |

### A standing note on `offcampus-universe-umich`

Unlike the CMB board, that site does **not display** the poster's email: it sits
in the page's JS payload behind a "Show" button, and each record carries
`showEmailClicks` / `showPhoneClicks` counters. The operator gates the reveal
and meters it; reading the address out of the payload bypasses that.

Hugo was shown this and chose to proceed (2026-09-18). It is written down here
and in the adapter header so the decision is visible rather than buried. Two
practical consequences worth remembering:

- **Discovery is self-identifying.** The bot sends
  `User-Agent: WroomlyBot/1.0 (+https://wroomly.app)`, so every request is
  stamped with our domain in their logs. That is deliberate — covert scraping
  would be worse — but it means "are you scraping us?" is a conversation to be
  ready for.
- **Every recipient is told where we found them**, because the outreach email
  says so. A forwarded complaint is the likeliest way this surfaces.

Revisit this first if Off Campus Universe objects or a data partnership is
offered.

### Why discovery fetches only 10 pages by default

Each detail page is ~2.4MB, and the admin console runs discovery inside a
serverless function capped at 60s (`maxDuration` in
`api/admin/agents/route.ts`). A batch of 40 measured well over 2 minutes in
testing — that's what "Run failed" was. `maxFetches` defaults to 10, which
measured ~33s end to end, and `fetchLeads` also stops itself early past a 45s
internal budget as a second, independent guard against a slow day. Discovery
is idempotent (`knownIds`), so a smaller batch just means the backlog clears
over a few runs instead of one — which is also kinder to someone else's site
than a 40-page burst every click.

## Known gaps

- **No DMCA agent registered — and one of the two conditions it relied on
  has now been relaxed.** Without a registered agent there is no §512 safe
  harbour. This was originally kept clear by drafts staying unpublished AND
  photos never being copied. On 2026-10-01 photos started being copied (by
  Hugo's decision) — privately, and published only if the owner chooses — so
  only the first condition still fully holds. Some posts carry a building's
  marketing photos, which aren't the poster's to grant. Registering an agent
  with the US Copyright Office is the revisit this note always asked for.
- **Bounces and complaints are not fed back.** `outreach_suppressions` supports
  `bounced`/`complaint` reasons but nothing writes them yet — wire a Resend
  webhook before volume grows.
- **No per-lead actions in the console yet** (e.g. manually skip a lead). The
  queue is read-only; `/admin/import-review` covers the drafts themselves.

### A standing note on `ohana-a2`

Ohana's terms of use say that "scraping Ohana's websites is strictly prohibited"
and list crawlers and automatic devices. The adapter reads only public pages, at
one request a second, with a User-Agent that names Wroomly, and Ohana's
robots.txt allows listing pages. That does not change what the terms say. It is
the same kind of restriction that kept Craigslist off the list, so this source
is registered but never runs unless someone names it on purpose. Neither of the
other two sources' terms could be read when this was written: RotatingRoom's terms
page loads its text with JavaScript and the SubLeaps terms page returned an error.
Their robots.txt files allow ordinary crawlers (SubLeaps disallows named AI-training
bots, which Wroomly's is not). Read both terms in a browser before enabling them,
and again if either site changes.

## Messaged by hand (manual outreach)

Leads with no email (SubLeaps, RotatingRoom, Ohana, Reddit) can only be reached
through the other site's own messenger. A person sends those messages; this
tracks them, in the same spirit as the email pipeline.

- **Recording.** `scripts/agents/manual.mjs sent` records the first message on a
  lead (marks it contacted and keeps the conversation link); `reply`, `out` and
  `state` log what came back, what was sent next, and the outcome. The thread
  lives on the lead in `extracted.manual`, so there is no migration.
- **Dashboard.** `/admin/agents` has a **Messaged by hand** panel above the leads
  table. Each lead shows its conversation, a state (waiting, replied, listed, not
  interested, closed), why it needs attention, and the next message, prepared.
- **The rules.** One follow-up, three days after a first message with no reply.
  Four days after that with still no reply, the lead is closed. A "no" closes it.
  A reply is never answered automatically: the next message is prepared (a draft
  link for someone interested, an answer for a question, a polite close for a no)
  and a person pastes and sends it.
- **Claim your draft.** **Add claim link** makes a draft listing from the post's
  facts (rent, dates, bedrooms, description, never a guessed location or photos)
  and a fresh 7-day claim link, the same flow as the email outreach. Only the
  token's hash is stored, a newer link replaces an older one, and opening the
  link claims nothing. The conversation log redacts any claim link, so the secret
  is never kept.
- **Checking for replies.** The other site does not tell us. Open its inbox and
  log replies in the panel (or ask Claude to check the inbox and log them).
