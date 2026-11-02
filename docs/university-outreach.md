# Partner-university outreach

Writes to the **exchange / international office** of universities that send
students to the University of Michigan, asking them to point those students at
Wroomly for housing. Admin: `/admin/universities`.

```
research  →  data/university-prospects.json      (LOCAL ONLY, gitignored — who, which office, which address, WHERE it was seen)
import    →  university_prospects                 (npm run universities:import -- --write)
draft     →  subject + body from the template     (button, per prospect, editable)
approve   →  you approve THIS exact message       (voided by any later change)
send      →  one email, from the sender you chose (button; or "send approved", capped)
```

Nothing is automatic past *draft*. A person approves, and a person presses send.
**Tick the checkboxes** in the table (or the header box for everything shown,
e.g. after filtering to one country) and use **Approve N** / **Withdraw approval**
to act on just those; a ticked row hidden by a filter is never acted on.
**Approve all** approves every drafted message in one click — each still gets its
own hash of its own text, so editing any of them afterwards withdraws just that
approval — and it refuses outright until the sender and Reply-to are valid.
**Send me a test** (main page and each university) mails the template, or that
university's draft, to the signed-in admin's own address only.

## What "approved" means

Approving stores a hash of **To, From, Reply-to, subject and body**. At send time
the hash is recomputed from what would go out *right now*; if anything differs —
you edited a word, changed the recipient, changed the sender or the reply-to
address — the send is refused until you approve again. So the message that goes
out is always the one you last looked at. (`src/lib/universities/gate.ts`,
unit-tested.)

## Where each email comes from

Set in **Sender and template** on `/admin/universities` and shown on every
message page, in the confirm dialogs, and frozen onto the row when sent:

- **From** — a name and an `@wroomly.app` address (the domain verified in Resend;
  anything else is refused). Default: `hugodelgado@wroomly.app`.
- **Reply-to** — the inbox you actually read. Required. Default: `delghu@umich.edu`.

**Send me a test** mails the draft to *your own* account email (taken from your
session, not from a request field) with `[TEST → recipient]` in the subject and
the real From/Reply-to. It changes nothing.

## Safety switches

| Rule | Where |
|---|---|
| Real sends need `UNIVERSITY_OUTREACH_ENABLED=true` in the server env (and a redeploy) | `checkSend` |
| Approval is bound to the exact envelope | `approvalHash` |
| Never the same address twice (even under two entries) | `checkSend` |
| Opt-outs: "Said no — never write again" adds the address to `outreach_suppressions`; hard bounces/complaints from the Resend webhook land there too | `markOutcome`, `/api/resend/webhook` |
| Daily cap (default 100, max 200) over a rolling 24h | `checkSend` |
| A bulk send stops starting new sends after ~45s (the request is killed at 60s, and a row is claimed before it is mailed) and says how many are left | `sendApproved` |
| A send claims the row before mailing, so overlapping requests can't both send; a failed send is put back to *approved* | `sendOne` |
| An address is only stored with the page it was read from; private mailboxes (gmail…) are dropped | `normalizeProspect` |

**Languages.** French universities get a French email (`FRENCH_TEMPLATE` in
`src/lib/universities/template.ts` — built in, gender-neutral first person,
formal "Madame, Monsieur,"). Other European universities get the English email
plus one line, "I'm from France myself…" (`{{origin_line}}` in the English
template); everywhere else that line is blank. The editable settings template is
the English one; each individual message can still be edited before approving.
**Redo drafts** regenerates drafted (not approved) messages after a template change.

**Follow-ups.** A university we emailed that hasn't replied or said no becomes
*due* 10 days after the first email (`FOLLOWUP_MIN_DAYS`). The **Follow-ups** box
on `/admin/universities` lists everyone with their due date; **Draft** writes a
short, polite follow-up (French for French schools) naming the date of the first
email; you approve it as an exact message (separate hash, so a first-email
approval can never send a follow-up), and send it. One follow-up per university,
ever; it counts against the same daily cap; replied/declined/suppressed are never
followed up. Needs migration 046.

## Replies

`/admin/universities` → **Replies** shows what universities write back and what to
do about it. Needs migration 047.

**Reading a message is rules, not a model** (`src/lib/universities/replies.ts`):
an automatic reply, a bounce, a request to stop, or a person — in English,
French, Spanish and German. A model is only used afterwards, for a person's real
reply, to summarise it and prepare an answer (`reply-drafter.ts`), and the
incoming email is treated as untrusted data in that prompt.

| What arrives | What happens, automatically |
|---|---|
| **Asks us to stop** ("not interested", "please do not contact us", "ne plus nous contacter"…) | The address is suppressed and the university marked declined **immediately** — our email promised "reply and I won't write again", so this never waits for a person |
| **Auto-reply / out of office** | Recorded; nothing to answer; the follow-up is held (14 days, longer if they quote a delay — some auto-replies even say "please do not follow up") |
| **Bounce** | Recorded; nothing to answer |
| **A person** | University marked replied; lands in your inbox with a summary, a prepared answer, and the best time to send it (09:30 their local time on a weekday; "now" if it is already working hours there) |

**Nothing is ever sent without you.** A prepared answer is only text until you
approve THE EXACT message (hash of to / from / reply-to / subject / body / thread);
any edit, or a change of sender, voids the approval. Answers go only to the person
who wrote, in the same email thread (`In-Reply-To`), from the configured sender,
and never to a suppressed address. If they ask for the overview, the draft says so
and flags "attach or link the one-page overview" — there is no attachment ready.

**How replies get in.** Everything lands in your umich mailbox
(`hugodelgado@wroomly.app` forwards there). `scripts/universities/ingest-replies.mjs`
takes messages from that mailbox into the dashboard (dry run by default; a message
is stored once). Claude reads the mailbox through the Gmail connector and feeds it;
a Resend inbound subdomain would make it fully automatic and independent of any
laptop (see the PR notes).

### Automatic inbox (Resend inbound)

Replies reach the dashboard by themselves — no laptop, no syncing:

```
university replies → hugo@replies.wroomly.app → Resend → POST /api/resend/webhook (email.received)
  → stored + read by the rules → university marked replied / opt-out suppressed
  → (after the response) answer prepared by the assistant → you are emailed a notice
```

Nothing is sent by this path. The slow part (the assistant, the notice) runs after
the webhook has answered, and a failure there never loses the stored message; if
storing fails the webhook answers 5xx so Resend retries (the replay mark is
undone first, otherwise the retry would be dismissed as a repeat). Our own
`@wroomly.app` mail is ignored so tests and notices can't become "replies".
Auto-drafting stops after 20 people's replies in an hour (a flood of mail to the
address can't run up model calls); they still arrive and wait for a click.

**One-time setup**

1. Resend → **Domains → Add domain**: `replies.wroomly.app`, region US East,
   **Receiving on, Sending off**. It shows one **MX** record.
2. Vercel → the `wroomly.app` domain → **DNS Records** → add that MX record
   (name `replies`, the value Resend shows, priority 10). Back in Resend, **Verify**.
3. Resend → **Webhooks** → the existing `https://wroomly.app/api/resend/webhook`
   → add the event **`email.received`** (keep `email.bounced`, `email.complained`).
4. Apply migration 048, then on `/admin/universities` set **Notify me at** (an inbox
   you read) and save.
5. **Test before switching:** set Reply-to to `hugo@replies.wroomly.app`, save, click
   **Send me a test** on any university, and reply to it from your own inbox. Within a
   minute the reply appears under **Replies** (as "unknown sender") and you get a notice.
   The Replies panel says "Automatic inbox is on" with the time of the last arrival.
6. Optional: in ImprovMX add `hugo@replies.wroomly.app` as a second destination of
   the `hugodelgado` alias, so automatic replies (sent to the From address) are
   captured too.

If nothing arrives: the Resend API key must be **Full access** (reading a received
email is not a sending permission), and the MX record must show as verified.
Emails already sent keep Reply-to `delghu@umich.edu`; their replies still land in
that inbox and can be loaded with `ingest-replies.mjs`.

**The overview page.** `wroomly.app/exchange` (`src/app/(app)/exchange/page.tsx`) is the
one-page overview for exchange offices and students, and the link in the emails
(`OVERVIEW_URL` in `template.ts`; the French emails and both follow-ups use it too, and
the reply assistant includes it when someone asks for "the overview"). It prints as
one A4 page. It must stay **public** (`/exchange` is in `PUBLIC_ROUTES` in
`src/middleware.ts`, guarded by `tests/e2e/exchange.spec.ts`): its readers have no
Wroomly account. It makes only claims the site already makes elsewhere, and says
nothing about prices or listing counts, which it cannot keep current.

The email includes who is writing, that Wroomly is independent of U-M, and one
line to reply and be left alone. Replies arrive in the Reply-to inbox; mark them
with **They replied** so the table shows where each university stands.

## Research

`data/university-prospects.json` is **not committed**: this repo is public, and the
file is a list of contact addresses (a few of them named staff). It lives on the
machine that runs the import; the database is the source of truth afterwards.
It was produced by reading each university's own
site and the Michigan schools' incoming-exchange pages (Ross, Engineering IPE,
UMSI, plus partners found on the universities' own exchange pages). Every entry
carries an `evidenceUrl` showing the Michigan partnership, and every address
carries `emailSourceUrl`. Confidence is `verified` (seen on the office's own
page), `likely` (a general address, or one that could not be re-confirmed) or
`not_found` (form / phone only).

Every address was then **re-fetched independently** and looked for on its source
page: 62 of 71 were found there (HTML or PDF). The rest — sites that block bots,
disguised addresses like "replace * with @", unreadable PDFs — were downgraded
from `verified` to `likely` with a note, and one address that was reported but
is NOT on its page (St. Gallen) was removed. Addresses go stale — spot-check
before a big send.

## Timing

Exchange students are nominated by their home university and then look for
housing. Incoming-winter students are searching now (Oct–Dec); fall students are
nominated Feb–April and search May–August. Write now for winter and again in
February for fall.
