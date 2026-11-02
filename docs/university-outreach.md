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

Nothing is automatic past *draft*. A person approves every message, and a person
presses send.

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
  anything else is refused).
- **Reply-to** — the inbox you actually read. Required; the default is blank so
  nothing can be approved before you choose.

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
| Daily cap (default 10, max 50) over a rolling 24h | `checkSend` |
| A send claims the row before mailing, so overlapping requests can't both send; a failed send is put back to *approved* | `sendOne` |
| An address is only stored with the page it was read from; private mailboxes (gmail…) are dropped | `normalizeProspect` |

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
