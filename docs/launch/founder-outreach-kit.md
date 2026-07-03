# Founder Outreach Kit — Week 1 (July 2026)

Everything Hugo sends or posts personally, drafted and ready to adapt. Voice
rules apply (see `.agents/product-marketing.md`): student-to-student, always
disclose you built it, never claim payments/escrow, never trash the FB groups.
Attribution: any link you share can carry `?ref=<slug>` (e.g. `?ref=hugo-dm`,
`?ref=fb-group`, `?ref=reddit`) — it's recorded at signup once migration 030
is applied, and `npm run metrics` splits by it.

---

## 1. Founding-supply DMs (personal network)

Target: anyone you know leaving Ann Arbor for fall (abroad, co-op, internship
extension). Send individually — never blast. Adapt freely; these are 80% drafts.

**Close friend:**
> yo — you're gone for fall right? is your place sublet yet?
> I built a sublet site for umich students (wroomly.app) — everyone's
> @umich.edu verified so it's not the FB scam roulette. I'm hand-picking the
> first listings before it opens to renters in August.
> if you forward me your old FB post (or just photos + rent + dates) I'll have
> it live in like 2 minutes. free, obviously.

**Acquaintance / friend-of-friend:**
> hey! [mutual] mentioned you're leaving for [semester/internship] — did you
> find someone for your place yet?
> I'm a UMich student and I built wroomly.app, a sublet site where every
> account is @umich.edu-verified (got tired of the scam posts in the housing
> groups). I'm lining up the first listings before renters come in August.
> It's free — if you send me your old post or a few photos + rent + dates,
> I'll set the listing up for you. takes 2 min: wroomly.app/import-listing

**Follow-up (one only, ~5 days later):**
> no stress either way — but August renters start looking soon, so if you want
> the place listed before the wave, now's the easy moment. offer stands to set
> it up for you.

## 2. Facebook housing-group replies

Reply to "subletting my place" posts. Rules: only reply where group rules
allow; always disclose; never reply to renter-seeking posts with a pitch
(that's what the site is for later); 5 helpful no-mention interactions per 1
mention.

**To a lister:**
> Nice place! If it's still open — I'm a UMich student who built a sublet site
> where every account is @umich.edu-verified (wroomly.app). Happy to cross-post
> this for you there for free, takes 2 minutes and you keep doing whatever
> works here too. DM me if you want it up.

**To someone asking "is this legit?" on a scam-looking post (no mention):**
> Classic red flags: deposit before viewing, won't do a live video call,
> price way under comparable places. Never wire/Zelle/gift-card anyone you
> haven't verified. Reverse-image-search the photos too.

## 3. Reddit (r/uofm) — account aging drafts

July = helpful answers only, **zero Wroomly mentions**. The founder post comes
at launch (draft below, hold until then). Adapt these to real threads; don't
paste verbatim into multiple threads.

**"Subletting for fall, where do I even post?" →**
> The FB groups (UMich Housing, Sublets & Roommates) are still where most
> volume is. Post real daylight photos, exact dates, rent + what utilities are
> included, and how many roommates. Expect to go slightly under your own rent
> — fall subletters have options. And get landlord approval in writing first;
> most Ann Arbor leases require it (some charge a small re-let fee).

**"Is $X reasonable for a summer sublet near campus?" →**
> Summer runs well under academic-year rates — the lister mostly wants to stop
> paying for an empty room. Furnished near Central/South U holds value best.
> Compare against live listings for the same block, not the academic-year rate.

**"Landlord says I need approval to sublet?" →**
> Yes, that's standard here. Email the leasing office, ask for the sublet
> policy, keep the reply. Subletting without written approval can put your own
> lease at risk — the paper trail is the whole game. Same for the deposit:
> Michigan law says it comes back (or an itemized damage list) within 30 days
> of lease end, so document everything with timestamped photos.

**LAUNCH POST (hold until full launch — August):**
> **I built a sublets site where everyone is umich-verified — roast it**
>
> UMich student here. After watching the housing groups eat people's deposits
> every summer (the "wire me before you can see it" specials), I spent the
> year building wroomly.app: sublets only, every account has to verify an
> @umich.edu email before they can list or message, and it's completely free
> — no fees, you arrange rent directly with the other person.
>
> ~140 listings are on it as of today. I want the renter side to survive
> contact with real users before the fall wave, so: roast it. Broken flows,
> missing filters, sketchy vibes, whatever — I'll fix the real ones this week
> and post back.

## 4. Lawyer email (privacy-policy escrow edit + sublease template)

Subject: **Two small review items — student housing site (Wroomly)**

> Hi [name],
>
> Two contained items for wroomly.app (student sublet marketplace, University
> of Michigan; currently free and payment-less — we deliberately do not
> process rent or deposits):
>
> 1. **Privacy policy edit.** One clause still references payments "held in
>    escrow" from an earlier design. Payments are disabled platform-wide; we
>    need the data-use language aligned with the current matching-only model
>    (accounts, listings, messages; no payment processing).
> 2. **Michigan sublease agreement template.** We have a draft one-page
>    sublease agreement we'd like reviewed for Michigan enforceability. We
>    intend to offer it as a free download — it needs to be safe for students
>    to actually use (dates, rent, deposit terms, utilities, condition).
>
> Both are small; happy to send the documents. Could you estimate cost/time?
>
> Thanks,
> Hugo

## 5. Launch-flip checklist (supply-only mode — when you say go)

1. Vercel → wroomly project → Settings → Environment Variables → add
   `SUPPLY_ONLY_MODE=true` (Production). Optionally set
   `SUPPLY_ONLY_BYPASS_TOKEN=<random>` for your own preview access
   (`any-url?bypass=<token>`).
2. Redeploy (env changes need a new deployment).
3. Smoke test (or ask the agent to run it):
   - anon `/` → 302 `/coming-soon`; waitlist submit works
   - anon `/guides`, `/ann-arbor/central-campus`, `/listings/<id>`? — guides +
     neighborhoods stay 200 (crawlable-content allow-list); `/listings` browse
     → 302
   - `/list-place`, `/sign-up`, `/import-listing` → 200 (supplier funnel open)
   - signed-in supplier → full site
   - `/sitemap.xml`, `/robots.txt`, `/llms.txt` → 200
4. Announce nothing yet — supply-only mode is the quiet period for hand-
   recruiting listings.

**Also before launch (10 min, dashboard-only — deliverability):**
Supabase → Authentication → Emails/SMTP: confirm **custom SMTP** is
configured (use Resend's SMTP credentials — the domain is already verified
for notifications@wroomly.app). Supabase's built-in sender is rate-limited to
a handful of emails/hour, which silently kills signup confirmations the first
busy day. While there: set the confirm-email template's from-name to
"Wroomly".

## 6. Attribution slugs (use consistently)

| Context | Link |
|---|---|
| Personal DMs | `wroomly.app/import-listing?ref=hugo-dm` |
| FB group replies | `wroomly.app/import-listing?ref=fb-group` |
| Reddit launch post | `wroomly.app?ref=reddit` |
| Flyers (August) | `wroomly.app/list-place?ref=flyer-<location>` |
| Reps (August) | `wroomly.app?ref=rep-<name>` |
