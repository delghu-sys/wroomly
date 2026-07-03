# Wroomly — Marketing Plan v1

**Prepared by:** Claude (fCMO engagement, agentic stack)
**For:** Hugo (founder)
**Date:** 2026-07-03
**Status:** Draft v1 — for founder review

---

## 1. Executive summary

This plan optimizes for one thing: **proving that sublet matches happen on Wroomly at the University of Michigan** — at least 100 confirmed matches by June 2027, at effectively zero customer-acquisition cost. Not revenue (payments stay off by design), not scale (one campus), not vanity traffic. Liquidity, measured in matches.

**Three big bets, ranked by leverage:**

**Bet 1 — The campus calendar is the growth model.** Wroomly's demand doesn't compound monthly; it arrives in four pulses — August move-in, October–November study-abroad departures, the February–April summer-sublet season (the year's Super Bowl), and May–June intern arrivals. Every quarter of this plan is built to catch its pulse and stage the next one. The immediate implication: launch must happen before the August pulse, which means the supply-only flip happens in July and 20–30 founding listings get recruited by hand — from Paris, digitally — starting now. The February season is where the liquidity proof lands or doesn't; it will be won by the preparation done in December.

**Bet 2 — Trust distribution beats paid distribution — permanently, not just for now.** With LTV at $0, any CAC above $0 is uneconomic, so paid channels aren't deferred, they're rejected. The replacement is the trust machine: the anti-scam positioning ("every account is a real, named @umich.edu student"), the borrowed-community playbook (Facebook housing groups, r/uofm, rep-carried GroupMes), a Michigan Daily story pitched on the scam problem rather than the startup, and 3–5 named campus ambassadors compensated in title and influence rather than cash. Word-of-mouth in a dense campus network isn't a channel here — it's the endgame; the plan's referral mechanics just give it a link and a nudge.

**Bet 3 — The founder + agentic stack is the whole marketing org.** This quarter already proved it: security hardening, full accessibility remediation, an AI-SEO implementation, and a community playbook shipped by one founder plus the agent stack. The plan assigns every move accordingly — Hugo makes decisions and shows up (Reddit, the Daily, reps, campus); the stack writes, builds, measures, and maintains the content/SEO/lifecycle machinery. No hires, no agencies, no tools budget beyond ~$100/mo. The ~$400/mo discretionary goes to swag, print, and micro-experiments.

**What twelve months plausibly looks like (June 2027):**
- 100+ confirmed matches cumulative; ≥50% of peak-season listings receiving a qualified inquiry within 14 days
- 200+ listings created across the year, ≥20% referred; 1,000+ verified student accounts
- Wroomly cited by AI answer engines for "how to sublet at University of Michigan"-class queries; page-1 rankings on long-tail guide queries; one (ideally two) Michigan Daily stories
- A rep program and seasonal playbook documented well enough to be repeatable — the precondition for both the monetization decision and any second-campus conversation, both of which are made in Q4 with real data, not hope

**90-day priorities (July 5 – October 3):**
1. Flip the supply-only launch (July) and full-launch before move-in (August)
2. Hand-recruit 20–30 founding listings via personal network + Facebook-group cross-post offers, pitched through the 2-minute AI importer
3. Wire analytics, define "match" in code, and stand up the weekly liquidity dashboard — before traffic exists
4. Ship the email spine (inquiry alerts, Match alerts, welcome) and harden @umich.edu verification
5. Execute the launch trust moment: r/uofm founder post + Michigan Daily pitch + move-in flyering + scam-alert ritual debut
6. Recruit 3–5 campus ambassadors with `?ref=` attribution live, upon return to Ann Arbor in late August

The bar for this quarter: launched, 40–60 live listings, 300+ demand signups, the first 5–10 matches, and a dashboard that says so.


---

## 2. Strategic frame

### What Wroomly is, in one sentence

Wroomly is the sublet marketplace built exclusively for verified University of Michigan students — every account confirmed with an @umich.edu email, free to use, matching students who are leaving Ann Arbor with students who need a place there.

### The category we're claiming

Wroomly is not competing in "rental listings" (Zillow, Apartments.com don't do student sublets) and it's not competing in "student housing platforms" (dorm-adjacent SaaS). It's redefining a category that currently has no product at all: **the campus sublet market, which today runs on Facebook groups, GroupMe messages, and luck.** The category frame is *verified campus subletting* — and the claim is trust: "the only place where everyone you talk to is a real, named U-M student." The incumbents aren't companies; they're unstructured venues with a scam problem. That's the wedge and the story.

Category implication: Wroomly's competitor content strategy is not "Wroomly vs. Zillow" pages — it's "the safe alternative to the Facebook housing group" told through scam-avoidance authority.

### Who we're for (ICP, distilled)

- **Supply — the departing student.** Sophomore–senior leaving for a summer internship, co-op, or study abroad; paying rent on a room they won't use; wants it filled fast without wiring-money-to-strangers risk. Stated want: "fill my room." Real want: stop losing money without getting burned or breaking their lease.
- **Demand — the arriving student.** Student needing May–August housing (summer research, internship in Ann Arbor) or a term-time room (transfer, roommate fallout, semester abroad returnee). Stated want: "cheap place near campus." Real want: certainty the listing and lister are real.
- Both sides are the same population at different moments — a renter this summer is a lister next year. This is Wroomly's structural advantage: cross-side conversion is natural, not forced.
- ~50,000 addressable students; seasonally pulsed (peak listing: Mar–May and Oct–Nov; peak searching: Feb–Apr and Jul–Aug).

### The business-model logic

Revenue is intentionally **$0 for the plan horizon.** `PAYMENTS_ENABLED=false`; the full Stripe escrow flow exists in code and is deliberately gated. The 12-month objective is **matching liquidity** — proof that real sublet matches happen through Wroomly at UMich. The monetization thesis (parked, designed in the recurring-rent doc) activates only after liquidity: once matches are routine, a take on first-month + deposit via the existing escrow flow is the natural switch to flip.

The acquisition-economics theory at this stage: CAC must be ≈$0 (organic, word-of-mouth, ambassador) because LTV is $0 by design. The compounding thesis is threefold: (1) **SEO/AI-SEO compounding** — guides and neighborhood pages accrue authority against evergreen queries ("how to sublet at university of michigan"); (2) **seasonal word-of-mouth compounding** — each sublet season's successful matches become next season's referrals in a small, dense, high-churn-by-graduation network that renews itself every year; (3) **cross-side compounding** — matched renters become listers.

### Brand voice (the non-negotiable)

Not formally documented until now — this section is the working voice doc (extracted from the live product copy):

- **Student-to-student, not company-to-consumer.** "Written for U of M students, by people who get the drill." First person plural sparingly; second person freely.
- **Straight-talking and specific.** Michigan-specific referents (the Diag, South U, Kerrytown, GroupMe, winter semester) over generic ones. Numbers and concrete steps over vibes.
- **Anti-scam, never fear-mongering; protective, never preachy.** "Use whatever works, just never wire money." Never disparage the Facebook groups or competitors.
- **YES vocabulary:** verified, real students, free, sublet (not "sublease" except legal contexts), match, "@umich.edu-verified."
- **NO vocabulary:** escrow / secure payments / fees (until PAYMENTS_ENABLED — hard rule after the 2026-07 copy sweep), "revolutionary/disrupting," urgency pressure ("act now"), corporate hedging.
- **Claims must be true today.** The product describes what exists, not the roadmap. AI engines cache copy; false claims get cited (learned and enforced this cycle).
- **Fair-housing safe:** listing-related marketing never characterizes ideal tenants by protected class; "verified student" is the only qualifier we market on.
- **Display voice:** headlines allow the playful italic accent ("Subletting at Michigan, *explained.*"); body copy stays plain and warm.


---

## 3. Current state

### Team composition (marketing surface area)

| Person | Role | Marketing surface area |
|---|---|---|
| Hugo | Founder (solo) | Everything: product, engineering, positioning, content direction, launch decisions. UMich student — **in Paris until fall semester**; on-campus motion unlocks late August |
| Claude agentic stack | fCMO + execution layer | Code, SEO/AI-SEO, content production, audits, analytics queries, copy — demonstrated across security, a11y, UX, and AI-SEO cycles this quarter |
| Campus ambassadors (planned, ×3–5) | Distribution | GroupMe/FB presence, scam-flagging, supplier recruitment — recruit late August (see §7) |

No marketing hire is needed or affordable in this plan's horizon. The first "hire" is the ambassador cohort (non-cash compensation). If liquidity is proven and a raise ever happens, the first paid role would be a campus-ops lead (Manager title), not a marketer — distribution here is operations, not media buying.

**The Paris constraint (structural, temporary):** July–August execution must be entirely digital — repo, content, Reddit/FB from behind a screen, remote DMs to friends still in Ann Arbor. Anything requiring physical presence (flyering, tabling, dorm-move-in stunts) is scheduled after return. The plan is sequenced around this.

### Marketing budget (current)

- Paid acquisition: **$0** (and stays $0 — see §4 skip rationale)
- Tooling/hosting: Vercel + Supabase + Sentry + domain ≈ **<$100/mo**
- Discretionary: **≈$400/mo** — earmarked: ambassador swag/print (~$150/mo during semester), micro-experiments (~$100/mo), buffer
- Retainers/headcount: $0
- Blended CAC: N/A pre-launch → **must be ≈$0 by design** (LTV is $0)
- Tier: **pre-seed/bootstrapped (Tier 1)** — every move in this plan is executable at this tier; no move assumes future budget

### Phase of growth

Pre-revenue by design, pre-launch in practice — the marketplace equivalent of $0–10K ARR, where the binding constraint is **liquidity, not revenue**: enough listings that searchers find something, enough searchers that listers get inquiries. Everything in this plan serves the liquidity loop; revenue phases are deferred deliberately (§8).

### What's already done (acknowledge, then build on)

| Asset | Status | Marketing leverage |
|---|---|---|
| Full product (listings, filters, messaging, admin, Match v2 AI concierge, AI listing importer) | Built, deployed | The AI importer ("forward your old FB post, 2 minutes") is the killer supply-acquisition tool; Match is the demand-capture engine |
| Security hardening (RLS, column grants, live-probe verified) | Shipped | Substantiates the trust positioning — "verified and actually secure" |
| Accessibility: 30+ violations → 0 (WCAG 2.1 A/AA, 17 routes) | Shipped | Agent/AI-crawler readability + inclusive-by-default brand proof |
| SEO/AI-SEO layer: 4 guides, 11 neighborhood pages, building pages, FAQPage/Article/Org schema, llms.txt, GSC | Shipped, fresh (2026-07-03) | The compounding acquisition asset; content pre-dates launch — rare and valuable |
| Copy-accuracy sweep (all escrow/payment claims removed) | Shipped 2026-07-03 | Launch-safe brand surface |
| docs/community-playbook.md | Written | §7's execution spec — ambassadors, borrowed communities, rituals |
| docs/legal-checklist.md, docs/recurring-rent-design.md | Written | Launch-gating clarity; monetization pre-designed |
| Supply-only soft-launch machinery (coming-soon + waitlist + crawlable content) | Built, not flipped | The launch is an env var away |

This is an unusually complete pre-launch foundation. The gap is not assets — it's that **zero distribution has ever been executed**.

### What's in-flight (drafted but not shipped)

| Item | Status | Blocker |
|---|---|---|
| Supply-only soft launch | Env flip + deploy | Founder go decision (target: July) |
| Wroomly Match public availability | Built, gated | Deliberate — opens at full launch |
| Ambassador program | Specced in playbook | `?ref=` attribution unbuilt; recruiting waits for ~2 wks before semester |
| Lifecycle email | Nothing beyond auth/waitlist | Provider decision (Resend vs. Customer.io) — §13 open decision #1 |
| Analytics events | Unwired | GA4-vs-PostHog decision — §13 open decision #2 |

### What's stuck (unstick this quarter)

| Issue | Cost of inaction | Action |
|---|---|---|
| Launch not flipped | Every July week ≈ lost supply-seeding time before the August demand wave | Flip supply-only mode in July (Week 1 of §9) |
| No analytics | Liquidity — the 12-month goal — is unmeasurable | Wire events + a liquidity dashboard before launch traffic arrives |
| "Match" undefined | North-star can't be counted | Define it (§13 open decision #3) in Week 1 |
| Privacy policy still says "escrow" | Inaccurate legal surface at launch | Lawyer-gated edit — schedule now |

### Audit rubric snapshot (scored from materials, 2026-07-03)

| # | Section | Score | Note |
|---|---|---|---|
| 1 | Positioning | 4 | Distinctive, consistent post-copy-sweep |
| 2 | Customer research | 1 | Founder-is-ICP intuition only; Match chat will capture demand language |
| 3 | Homepage | 4 | Strong brand + CTAs; conversion unproven |
| 4 | Sales/product pages | 3 | Listing detail + about strong |
| 5 | Conversion pages | 3 | Supplier funnel + waitlist exist; no seasonal/org LPs |
| 6 | Competitor comparison | 0 | Competitor is FB groups — "safe alternative" content, not vs-pages |
| 7 | Resources/content | 3 | High quality, thin volume |
| 8 | Onboarding | 3 | AI importer is a real differentiator; renter side minimal |
| 9 | Email lifecycle | 1 | Auth + waitlist only |
| 10 | Sales material | 0 | N/A (not B2B) |
| 11 | Messaging | 4 | Distinctive; now documented in §2 |
| 12 | Pricing | 1 | Free by design; thesis parked |
| 13 | CRO | 1 | No instrumentation |
| 14 | GTM launches | 1 | Machinery built, zero executed |
| 15 | Ads | 0 | None — stage-appropriate |
| 16 | SEO | 2 | Technically excellent, zero authority |
| 17 | Internationalization | 0 | Hyper-local by design |

**Total: 31/85 (36%).** The shape is "strong product, weak everything-distribution" — a textbook pre-marketing company, with one twist: the content/SEO/brand surfaces that most pre-launch companies lack are already strong. So the plan doesn't need a foundation quarter. It needs a **launch quarter** — and the longest sections that follow are Acquisition (§4) and Activation (§5) because that's where 0→1 lives, with Referral (§7) carrying unusual weight because word-of-mouth in a dense campus network is the only channel that can be dominant at $0 CAC.


---

## 4. Acquisition

### Current state

Zero acquisition history — the product has never been publicly promoted. What exists is potential energy: a technically excellent SEO layer on a zero-authority domain, a community playbook that hasn't been executed, and a founder who is himself the ICP but is in Paris until fall. Acquisition for a campus marketplace is really **two funnels**: supply (listings) and demand (searchers). Supply is the bottleneck first — a marketplace with searchers and no listings dies faster than the reverse, and the August demand wave is coming whether or not there's inventory.

### The plan

**Move 1 — Founding supply, recruited by hand (supply funnel; July).** The single most important acquisition motion of the year, and it's manual: DM/text every personal contact leaving Ann Arbor for fall, and respond to every "subletting my place" post in the UMich Facebook housing groups with a genuine offer to cross-post free via the AI importer ("forward me your old post — takes 2 minutes"). Target: 20–30 real listings before any public push. This works from Paris. Skills: `prospecting` for the outreach list structure, `copywriting` for the DM scripts (student voice, §2). No tooling needed beyond a spreadsheet and the importer.

**Move 2 — SEO + AI-SEO compounding (demand funnel; always-on).** The guides/neighborhood/building pages are built and fresh; the job now is authority and coverage. (a) Publish 2 new guides/month against the query calendar — "UMich fall sublets," "what to do if your roommate situation falls apart," "study abroad sublet checklist" (Oct), "summer sublet search guide" (Jan, ahead of the Feb–Apr season). (b) Earn the first backlinks: submit to student-housing and startup directories (`directory-submissions`), answer HARO-style queries on student housing (idea #59), and get one Michigan Daily mention (see Move 4). (c) Track AI-engine citation monthly: ask ChatGPT/Perplexity the 10 target queries ("how to sublet at University of Michigan") and log whether Wroomly is cited — the llms.txt + FAQPage schema work was built for exactly this. Skills: `content-strategy`, `ai-seo`, `seo-audit` (quarterly), `schema`. Tools: Google Search Console (wired), the repo via GitHub.

**Move 3 — Borrowed communities (demand + supply; per the community playbook).** Execute docs/community-playbook.md: 5:1 value-ratio participation in r/uofm and the FB housing groups starting now (Reddit account aging begins in July — helpful answers, no mentions), the founder-story "roast my site" post on r/uofm at full launch, and the Scam Alert of the Week ritual from late August. All of it works from Paris. Skills: `community-marketing` (playbook already written), `social` for the ritual content, `copywriting`.

**Move 4 — One campus-press moment (credibility anchor; September).** Pitch The Michigan Daily a story that isn't "student launches startup" but "the sublet scam problem at Michigan, quantified" — offer the scam-pattern taxonomy from the guides plus (post-launch) real numbers on verified listings. A Daily article is the citation anchor for both students and AI engines (a .edu-adjacent authority link on a zero-DR domain is worth more than 50 directory links). Skills: `public-relations`, `copywriting` (the pitch itself). Backup targets: UMich subreddit AMA, Happening @ Michigan listings for any event.

**Move 5 — Campus physical layer (supply + demand; late August, post-return).** Move-in week flyering (QR → /list-place and /listings) in high-density corridors (South U, East U, the Diag legally-postable boards), targeted at both sides. Cheap ($100–150 of the discretionary budget), high-context, and only possible once back on campus. Coordinate with ambassador debut (§7). Skills: `image`/`higgsfield-generate` for print-ready creative in brand style.

**Move 6 — Instagram presence (brand + demand; September onward).** One account, 2 posts/week ceiling: scam-alert carousels (the ritual, repurposed — `content-strategy` repurposing) and listing-of-the-week features. Instagram is where campus brands are checked for legitimacy — the account exists so that when a student hears "Wroomly" in a GroupMe, the check passes. Not a growth channel at this stage; a trust channel.

**Skipped (with reasons):**
- **Paid ads (all platforms)** — $0 LTV makes any CAC > $0 uneconomic; the addressable market is 50k students reachable through free channels. Revisit only if monetization turns on (§8). This is a strategy, not a budget limitation.
- **TikTok/short-form video** — content treadmill; no founder bandwidth; revisit only if an ambassador wants to own it (playbook stance).
- **Programmatic SEO at scale** — the neighborhood/building page system already covers the local surface; national expansion pages are premature until multi-campus (out of scope).
- **Product Hunt / startup-launch circuit** — the audience isn't there; UMich students are. The Daily > PH for this business.

### 90-day acquisition moves (July 5 – Oct 3)

| Weeks | Moves |
|---|---|
| 1–2 | Flip supply-only mode. Founding-supply DM sprint #1 (personal network). Begin Reddit account aging. Fix analytics + define "match" (§5/§13 prerequisites for measuring any of this) |
| 3–4 | FB housing-group cross-post offers (importer pitch). 2 new guides (fall-sublet + roommate-fallout queries). Directory submissions batch |
| 5–8 | Full launch before move-in. r/uofm founder post. Michigan Daily pitch. Move-in flyering + ambassador debut (post-return). Scam Alert ritual starts |
| 9–12 | Instagram cadence stabilizes. First AI-citation check. 2 more guides (study-abroad-departure queries for Oct–Nov listing wave). Review: listings by source, first liquidity read |

### 12-month acquisition outlook

- **Q1 (Jul–Sep):** 40–60 live listings, 300+ waitlist/Match signups, launch + press moment done, rituals running.
- **Q2 (Oct–Dec):** Study-abroad listing wave captured ("list before you leave" push per playbook). First organic rankings on long-tail guides queries. 500+ cumulative demand signups.
- **Q3 (Jan–Mar):** **The Feb–Apr summer-sublet season is the year's acquisition Super Bowl** — full-court press: seasonal guide + LP, reps in every housing thread, second Daily pitch ("scam season" angle), Match fully promoted. Target: 100+ new listings in the quarter.
- **Q4 (Apr–Jun):** Summer demand wave (interns arriving). Harvest: match stories as content, AI citations showing up for target queries, playbook documented for a possible second campus (decision-gated, §10).

### Skills + tools

- **Skills:** `community-marketing`, `content-strategy`, `ai-seo`, `seo-audit`, `schema`, `copywriting`, `public-relations`, `directory-submissions`, `prospecting`, `social`, `image`/`higgsfield-generate` (print + IG creative)
- **Tools:** GitHub (content ships as code), Google Search Console (wired), Supabase (source-of-truth attribution queries), manual AI-citation checks (ChatGPT/Perplexity/Google AI), spreadsheet CRM for founding-supply outreach


---

## 5. Activation

### Current state

Two-sided activation, both sides built but neither ever exercised by strangers:

- **Supply activation** = visitor → verified account → live listing. Assets: /list-place → /start-listing chooser, the classic wizard, and the differentiator — the **AI listing importer** (paste an old FB post, get a drafted listing, claim it). Nobody outside the founder's orbit has run this gauntlet; drop-off points are unknown.
- **Demand activation** = visitor → (pre-full-launch) waitlist/Match signup, or (post-launch) verified account → first inquiry sent. **Wroomly Match** (AI concierge chat → email alerts) is the highest-context demand-capture asset — and it's gated until full launch by design.

The @umich.edu verification step is both the moat and the biggest activation risk: every student has the address, but confirmation friction (email deliverability, expired links) silently kills signups if it misbehaves. It has never been load-tested by real users.

### The plan

**Move 1 — Instrument before traffic (Week 1; prerequisite for everything).** Wire product analytics (GA4 or PostHog — §13 open decision #2, recommend PostHog for funnel + session-replay on a free tier) with the canonical funnel events: `visit → signup_started → email_verified → listing_published` (supply) and `visit → match_chat_started → alert_created` / `signup → inquiry_sent` (demand). Define **"match"** in code (recommended: inquiry accepted by lister + contact exchanged — §13 open decision #3) and emit it as an event. Without this, the liquidity goal is a vibe, not a metric. Skills: `analytics`. Tools: PostHog/GA4, Supabase queries as backstop.

**Move 2 — Verification-flow hardening (Weeks 1–2).** Send test signups through @umich.edu confirmation from multiple mail clients; measure delivery time; add a "didn't get it?" resend + help path; ensure the auth emails pass SPF/DKIM (idea #50, Inbox Placement — here it's activation-critical, not retention). One deliverability bug at launch = every new user lost. Skills: `signup`, `emails`.

**Move 3 — Importer-first supply funnel (Weeks 2–4).** Make the AI importer the default path in every acquisition context (DMs, FB replies, flyer QR): it converts a 15-minute wizard into a 2-minute paste. Watch its completion rate; the wizard is the fallback, not the pitch. Add one activation nudge: draft-listing created but unpublished → single reminder email at 48h. Skills: `onboarding`, `cro`.

**Move 4 — First-session demand experience (Weeks 5–8, at full launch).** The renter's first session must end with a saved artifact: an inquiry sent, a Match alert created, or a saved search. Audit the listings browse → inquiry path with fresh eyes (the UX audit covered mechanics; this pass is about momentum): is the "verified student" trust story visible at the moment of contact? Is the inquiry composer inviting on mobile? Add empty-state guidance when filters return nothing ("set an alert — new places land daily"). Skills: `onboarding`, `cro`, `copywriting`, `marketing-psychology` (commitment device: the alert).

**Move 5 — Coming-soon page as an activation surface (July, pre-full-launch).** While supply-only mode is on, /coming-soon is the entire demand funnel. Give it one job: Match chat or waitlist email, nothing else. Test the headline against the trust frame ("Every account verified @umich.edu") vs. the utility frame ("Fall sublets, without the scams") once traffic exists. Skills: `cro`, `ab-testing` (directional, low-traffic honest — no false rigor).

### 90-day activation moves

| Weeks | Moves |
|---|---|
| 1–2 | Analytics wired; "match" defined + evented; verification flow hardened; resend path shipped |
| 3–4 | Importer completion tracked; draft-reminder email; coming-soon page single-purposed |
| 5–8 | Full launch: Match ungated; first-session demand audit + empty-state alerts; funnel dashboards reviewed weekly |
| 9–12 | First funnel-leak fix cycle from real data (fix the single biggest drop-off, re-measure) |

### 12-month activation outlook

- **Q1:** Both funnels instrumented; ≥60% of started listings reach published (importer path); verification success ≥95%.
- **Q2:** First-session demand experience iterated from real session data; supply activation nudges (photo-quality tips, price anchoring from comparable listings) shipped.
- **Q3 (peak season):** Activation holds under the Feb–Apr load; seasonal LP variants for "summer sublet" arrivals; Match tuned on a season of feedback data.
- **Q4:** Cross-side activation — post-match "you'll be the lister next year" moment (see §7).

### Skills + tools

- **Skills:** `analytics`, `signup`, `onboarding`, `cro`, `ab-testing`, `copywriting`, `emails`, `marketing-psychology`
- **Tools:** PostHog or GA4 (decision pending), Supabase (funnel queries), Sentry (already wired — activation-blocking errors surface here), the repo via GitHub


---

## 6. Retention

### Current state

Nothing exists beyond auth/transactional email — appropriate for pre-launch, but the marketplace's seasonal shape makes retention unusual and worth thinking about correctly from day one. Wroomly "retention" is not DAU: a student uses the product intensely for 2–6 weeks (one search or one listing), succeeds, and *should* go dormant until their next housing moment — possibly a year later. Retention here means three things: (1) **in-episode retention** — staying engaged until matched rather than drifting back to Facebook; (2) **cross-episode return** — coming back at the next housing moment; (3) **cross-side return** — the renter of this summer listing their own place next spring. Graduation caps any user's lifetime at ~4 years; the network retains by *replenishment* (each freshman class) as much as by individual return.

### The plan

**Move 1 — Pick the email provider and ship the spine (Weeks 2–4).** This is §13 open decision #1 and it gates everything here. Recommendation: **Resend** (developer-first, generous free tier, fits a Next.js/Supabase solo stack; Customer.io is overkill below thousands of users). Ship four transactional-plus flows in priority order: (a) **new-inquiry alert to lister** (the single most liquidity-critical email — a lister who misses an inquiry kills a match), (b) **saved-search / Match alert** (new listing matching criteria — the demand-side heartbeat), (c) draft-listing reminder (§5), (d) welcome-after-verification with one clear next step per side. Skills: `emails`, `copywriting`. Tools: Resend + Supabase triggers.

**Move 2 — In-episode momentum (Weeks 5–8).** For active listers: weekly digest ("your listing: X views, Y inquiries — listings with 5+ photos get more"). For active searchers: Match alert cadence tuned so silence never exceeds ~5 days during their episode (if no new matches, send nearest-miss listings). The enemy is the drift back to scrolling Facebook. Skills: `emails`, `churn-prevention` (the "save" here is attention, not subscription).

**Move 3 — Episode-close and dormancy respect (Weeks 9–12).** When a match happens or a listing fills: congratulate, capture the story (feeds §4 content and §7 referral), then **stop emailing.** Set expectations explicitly: "We'll ping you before summer-sublet season." A campus brand that spams during dormancy burns trust it can't rebuild in a 4-year customer lifetime. One or two seasonal wake-up emails/year, calendar-triggered (late Jan: "search season starts"; Oct: "leaving for winter? list your place"). Skills: `emails`, `marketing-psychology` (the anti-annoyance stance *is* the retention strategy).

**Move 4 — Support-as-marketing (ongoing).** At this scale every support interaction is founder-direct — make that a feature: fast, named, personal replies; every confusion logged and either fixed in product or answered in a guide/FAQ (feeding §4's content engine, idea #135). Sentry already surfaces errors; pair it with a visible help@ that actually answers.

**Explicitly not doing:** push notifications (no native app), win-back discounting (nothing to discount), engagement gamification (off-voice for a trust brand), monthly newsletter (nothing monthly to say pre-liquidity — the seasonal cadence is the honest one; revisit in Q3 if match-story volume supports it).

### 90-day retention moves

| Weeks | Moves |
|---|---|
| 2–4 | Provider decision; inquiry-alert + Match-alert + welcome flows live with SPF/DKIM verified |
| 5–8 | Lister weekly digest; alert cadence tuning; support@ SLA (same-day) |
| 9–12 | Episode-close flow + story capture; dormancy policy implemented; October "list before you leave" seasonal email drafted |

### 12-month retention outlook

- **Q1:** Email spine live; zero-missed-inquiry guarantee (every inquiry alerted within minutes).
- **Q2:** First seasonal wake-up cycle (Oct–Nov listing wave) — measure dormant-account reactivation rate.
- **Q3:** Peak-season in-episode retention measured properly for the first time (episode completion rate: % of searchers active in week 1 still active-or-matched in week 3).
- **Q4:** Cross-episode data exists — how many fall listers/searchers returned in spring? First honest read on whether the network retains across seasons.

### Skills + tools

- **Skills:** `emails`, `churn-prevention`, `copywriting`, `marketing-psychology`
- **Tools:** Resend (recommended; pending decision), Supabase triggers/cron, Sentry (wired), PostHog/GA4 cohorts


---

## 7. Referral

### Current state

Nothing built — but referral carries unusual strategic weight in this plan. With paid acquisition ruled out (CAC must be ≈$0) and a dense, high-trust, physically co-located network of 50k students who literally live together, **word-of-mouth is not a channel here; it's the endgame.** Campus housing decisions already travel by recommendation ("my roommate found her sublet on…"). The referral job is to give that existing behavior a name, a link, and a nudge. The community playbook (docs/community-playbook.md) already specs the ambassador program; this section integrates it and adds product mechanics.

### The plan

**Move 1 — `?ref=` attribution plumbing (Weeks 3–4; small build).** Persist a `ref` param through signup and listing creation; store on the user row; expose per-ref counts in admin. This is the measurement substrate for ambassadors, match-story shares, and organic advocacy — build it before anyone has a link to share. Skills: `referrals` (program design), plus a small product change. Tools: Supabase, the repo.

**Move 2 — Campus ambassador cohort (recruit late August; run all year).** Execute the playbook: 3–5 students, personally recruited (profile: big-org membership, active GroupMes, scam-adjacent story), compensated in title ("Founding Campus Rep"), visible product influence, first access, and swag from the discretionary budget. Each gets a `?ref=` link and paste-ready GroupMe blurbs. Monthly 30-min founder call; replace gracefully if inactive a semester. Their job is not selling — it's *being the answer* when "anyone know a sublet?" appears in a chat they're already in. Skills: `referrals`, `community-marketing` (playbook), `copywriting` (talking points), `emails` (rep lifecycle: onboarding, monthly digest).

**Move 3 — Share-after-value moments (Q2, post-first-matches).** The one honest moment a user wants to share is *the match*. At episode close (§6), the congratulations flow offers a pre-written, low-cringe share: "Found my subletter on Wroomly — verified UMich students only" with their ref link, for GroupMe/Instagram-story formats (where students actually share, not Twitter). No incentives attached at first — measure organic share rate before considering any reward. Skills: `referrals`, `social`, `copywriting`.

**Move 4 — Two-sided episode referral (Q3, peak season; idea #137 adapted).** During Feb–Apr, when demand outstrips supply, the demand side becomes a supply recruiter: "Know someone leaving for the summer? Send them this — you'll both get priority Match placement." Non-monetary, product-native incentive (priority matching) that costs nothing and reinforces liquidity. Gate on: priority placement must be real and small, or it corrupts Match integrity — cap and disclose it. Skills: `referrals`, `pricing`-style thinking applied to a non-cash incentive.

**Move 5 — Founder as referrer-zero (ongoing).** The r/uofm founder post, the Daily story, the scam-alert ritual — all §4 moves — are also referral seeds: they give existing users social proof to point at ("it was in the Daily") when they recommend Wroomly. No extra work; named here so the compounding is deliberate.

**Explicitly not doing:** cash referral bonuses (attracts gaming, off-voice for a trust brand, and there's no revenue to fund them); affiliate program (nothing to commission); viral loops engineered into core flows (housing is too high-stakes for growth-hack mechanics — trust first).

### 90-day referral moves

| Weeks | Moves |
|---|---|
| 3–4 | `?ref=` plumbing shipped; admin attribution view |
| 5–8 | Ambassador recruiting (post-return, pre-semester); rep kit (blurbs, links, talking points); debut with move-in flyering |
| 9–12 | First rep monthly cycle + attribution review; match-story share flow drafted (ships when first matches exist) |

### 12-month referral outlook

- **Q1:** Attribution live; 3–5 reps active; first referred listings measurable.
- **Q2:** Share-after-match flow live; organic share rate baselined; rep cohort reviewed (replace/expand).
- **Q3:** Two-sided episode referral live for peak season; referral share of new listings ≥20% (target — first real test of the WOM thesis).
- **Q4:** Unprompted-mention tracking (§13) shows organic advocacy exceeding rep-driven; rep program documented as a repeatable playbook (multi-campus precondition).

### Skills + tools

- **Skills:** `referrals`, `community-marketing`, `social`, `copywriting`, `emails`
- **Tools:** Supabase (`ref` attribution + admin view), Resend (rep lifecycle), the repo; Dub.co explicitly not needed at this scale (native param suffices)


---

## 8. Revenue

### Current state

Revenue is **$0 by explicit founder decision**, and this plan treats that as strategy, not gap. `PAYMENTS_ENABLED=false` gates a fully built Stripe Connect escrow flow (first month + deposit at booking, 5% renter fee); the recurring-rent architecture is designed and parked in docs/recurring-rent-design.md, deferred until 5 beta users validate the basic flow. The 2026-07 copy sweep aligned every public surface with the payment-less reality ("free to use," no escrow claims) — the marketing surface and the business model now tell the same story.

### The plan

**Move 1 — Protect the free story (now; ongoing).** "Completely free, no fees" is a live acquisition asset against the alternative venues and a trust accelerant. Keep it explicit on the about page and FAQ (done), in rep talking points, and in the Daily pitch. The discipline: never imply free-forever. The FAQ already says what's true today; when monetization arrives, the story is "payments protection now available," an *added* trust feature — not a rug-pull.

**Move 2 — Instrument willingness-to-pay signals passively (Q2–Q3; zero product change).** The liquidity year doubles as free market research: log how often users ask about payment protection in Match chats and support; capture match-story interviews' mentions of payment anxiety; note listings that fell through over money. This is the evidence base for the §10 Q4 monetization decision — collected without a single survey. Skills: `customer-research` (light protocol on existing touchpoints).

**Move 3 — The Q4 monetization gate (April 2027; decision, not commitment).** If liquidity is proven (§10 targets hit), run the pricing decision properly: escrow take (existing build: 5% renter fee on first month + deposit) vs. lister-side premium placement vs. staying free another season to maximize the network before switching costs exist. Inputs: Move 2's signal log, peak-season match volume, and the recurring-rent doc. The plan's stance: **do not turn on payments mid-season** — a business-model change during Feb–Apr peak risks the liquidity proof itself. Skills: `pricing`, `offers`. Tools: Stripe (built, gated), Stripe MCP when enabled.

### Unit economics

| Metric | Value | Note |
|---|---|---|
| ARPC | $0 | By design — PAYMENTS_ENABLED=false |
| Blended CAC | ≈$0 target | Organic + WOM only; measure actual (tool costs ÷ activated users) from Q1 |
| Annual retention | N/A → episode metrics instead | See §6 — episode completion + cross-episode return replace subscription retention |
| LTV | $0 (potential: ~5% × first month + deposit ≈ $60–100/match if escrow enabled) | Potential figure is directional, from existing fee structure |
| LTV/CAC | N/A this horizon | The year's "return" is liquidity proof + network, denominated in matches, not dollars |

**North-star consequence:** because revenue is $0, the plan's success metric must be non-monetary — **confirmed matches** (defined in §5/§13). Every section above already points at it.

### 90-day revenue moves

None — deliberately. The only revenue-adjacent work in the first 90 days is Move 1 (free-story consistency), which ships inside §4's copy anyway.

### 12-month revenue outlook

- **Q1–Q2:** $0 revenue; free story deployed; signal logging begins.
- **Q3:** $0 revenue through peak season (protected); signal log reviewed monthly.
- **Q4:** Monetization gate decision with real data. If GO: payments-on is a **Q1-2027-season launch project** (re-sweep all copy back to escrow claims, lawyer review of money flows per docs/legal-checklist.md, Stripe re-enable per config). If NO-GO: documented rationale + revised thesis.

### Skills + tools

- **Skills:** `pricing`, `offers`, `customer-research`; (`paywalls`/`ab-testing` only post-gate)
- **Tools:** Stripe (built, gated), Supabase (signal log), docs/recurring-rent-design.md + docs/legal-checklist.md as decision inputs


---

## 9. 90-day roadmap (July 5 – October 3, 2026)

Owners: **H** = Hugo (decisions, personal outreach, on-campus once back), **C** = Claude agentic stack (code, content, analysis), **R** = campus reps (from Week 7). Hugo is in Paris through ~Week 7 — all H-items before then are remote-executable by design.

### Weeks 1–2 — Unblock (launch prerequisites)

| Move | Stage | Owner |
|---|---|---|
| Flip SUPPLY_ONLY_MODE + deploy; verify coming-soon + crawlable content live in prod | Acquisition | H (flip) + C (verify) |
| Wire analytics (PostHog recommended) + canonical funnel events, both sides | Activation | C |
| Define "match" + emit event; liquidity dashboard v1 (Supabase query is fine) | Activation | H (decision) + C (build) |
| Harden @umich.edu verification: multi-client delivery test, resend path, SPF/DKIM | Activation | C |
| Founding-supply DM sprint #1: personal network leaving for fall (target 10 listings) | Acquisition | H |
| Begin Reddit account aging (helpful answers, zero mentions) | Acquisition | H + C (drafts) |
| Schedule lawyer edit: privacy-policy escrow reference | Compliance | H |

### Weeks 3–4 — Foundation

| Move | Stage | Owner |
|---|---|---|
| Email provider decision + spine: inquiry-alert, Match-alert, welcome, draft-reminder | Retention | H (decision) + C (build) |
| `?ref=` attribution plumbing + admin view | Referral | C |
| FB housing-group cross-post offers (importer pitch) — ongoing habit, ~30 min/day | Acquisition | H |
| 2 new guides: fall-sublet queries + roommate-fallout queries | Acquisition | C |
| Directory submissions batch (`directory-submissions`) | Acquisition | C |
| Coming-soon page single-purposed (Match/waitlist only) | Activation | C |
| Importer completion-rate tracking | Activation | C |

### Weeks 5–8 — Velocity (launch window; Hugo returns ~Week 7)

| Move | Stage | Owner |
|---|---|---|
| **Full launch** before move-in: ungate Match, ungate renter surfaces | All | H (go) + C (ship) |
| r/uofm founder post ("built this because of the scams — roast it") | Acquisition | H |
| Michigan Daily pitch (scam-problem angle) | Acquisition | H + C (materials) |
| Ambassador recruiting: 3–5 reps + rep kit (blurbs, `?ref=` links, talking points) | Referral | H |
| Move-in flyering: QR creative, print, corridors (South U, East U, Diag boards) | Acquisition | H + R, C (creative) |
| Scam Alert of the Week ritual begins (IG + rep-pasteable text) | Acquisition | C (produce) + R (distribute) |
| First-session demand audit + empty-state alert nudges | Activation | C |
| Lister weekly digest email | Retention | C |
| Instagram account live, 2 posts/wk ceiling | Acquisition | C (content) + H (approve) |

### Weeks 9–12 — Compound

| Move | Stage | Owner |
|---|---|---|
| First funnel-leak fix cycle: biggest measured drop-off, fix, re-measure | Activation | C |
| Episode-close flow + match-story capture (ships on first matches) | Retention/Referral | C |
| 2 more guides (study-abroad departure queries, ahead of Oct–Nov wave) | Acquisition | C |
| First AI-citation check (10 target queries across ChatGPT/Perplexity/Google AI) | Acquisition | C |
| Rep monthly call #1 + attribution review | Referral | H |
| October "list before you leave" seasonal email drafted + scheduled | Retention | C |
| **90-day review:** listings by source, funnel rates, first matches, liquidity read; recalibrate Q2 | All | H + C |

**90-day exit criteria:** launched publicly ● 40–60 live listings ● 300+ demand signups (waitlist/Match/accounts) ● first 5–10 confirmed matches ● both funnels instrumented with a weekly-reviewed dashboard ● reps active ● Daily story pitched (ideally landed).


---

## 10. 12-month outlook (July 2026 – June 2027)

### Framing

- **Budget method:** neither standard method applies cleanly (Method 1 needs ARR; Method 2 needs a revenue target) — revenue is $0 by design. The honest framing: **fixed envelope of ≤$500/mo ≈ ≤$6,000/yr**, allocated ~$1,200 tools/hosting, ~$1,800 campus physical + swag (semester months), ~$1,200 experiments, ~$1,800 unallocated buffer (which doubles as the 10–20%+ experimental layer). The scarce resource being budgeted is founder time, not cash — each quarter below names its time-shape.
- **End-of-year goal:** not ARR — **liquidity proof: ≥100 confirmed matches cumulative, with ≥50% of listings receiving a qualified inquiry within 14 days during peak season.**
- **Growth pattern expected:** not linear and not a hockey stick — **seasonal step-functions.** The campus calendar delivers demand in pulses (Aug move-in, Oct–Nov departures, Feb–Apr summer-sublet season, May–Jun arrivals); the realistic curve is a step up at each pulse with plateaus between. Plateaus are *expected* here, not failure signals — the S-curve layering is seasonal (each pulse = a curve to catch), and the next curve is always being staged during the current plateau. The 3-3-2-2-2 rule is irrelevant pre-revenue; the analogous discipline is **each season must beat the last on matches.**

### Q1 — Jul–Sep 2026 (Months 1–3)

**Funding state:** bootstrapped Tier 1 (holds all year — no raise planned; every quarter assumes it).
**Focus:** Launch and seed — supply first, then the August demand pulse.
**Time-shape:** Hugo remote (Paris) through August: digital-only outreach ~5–8 hrs/wk; heavier during launch window.
**Outcomes:** everything in §9's exit criteria.
**KPI targets:** 40–60 live listings ● 300+ demand signups ● 5–10 matches ● verification success ≥95% ● reps: 3–5 active.
**S-curve position:** riding the Aug move-in pulse; staging the Oct–Nov departure wave (guides + seasonal email already prepped in §9 W9–12).

### Q2 — Oct–Dec 2026 (Months 4–6)

**Focus:** Capture the departure wave; build the retention/referral muscles while traffic is calm.
**Time-shape:** Hugo on campus, in-person motion live; ~5 hrs/wk steady.
**Outcomes:**
- "List before you leave" push lands the Oct–Nov study-abroad/co-op listing wave (reps in org GroupMes; seasonal email; targeted guide ranking)
- Share-after-match flow live; organic share rate baselined
- First cross-side conversions observed (matched renters prompted toward listing)
- Signal log (willingness-to-pay, §8) running
- December: peak-season war plan written (content calendar, rep schedule, Daily pitch #2) — Q3 is won in December
**KPI targets:** +40 new listings ● 500+ cumulative demand signups ● 25+ cumulative matches ● ≥1 guide ranking page-1 for a long-tail query ● first AI citation observed for a target query.
**S-curve position:** departure-wave pulse riding; **staging the Feb–Apr super-cycle** (the year's biggest curve).

### Q3 — Jan–Mar 2027 (Months 7–9)

**Focus:** Peak season — the liquidity proof happens here or not at all.
**Time-shape:** Hugo's heaviest quarter (~8–10 hrs/wk in Feb–Mar); reps carry distribution.
**Outcomes:**
- Full-court seasonal execution: summer-sublet guide + landing surface, reps in every housing thread, scam-alert ritual at weekly cadence (peak scam season), two-sided episode referral live (§7 Move 4), Daily pitch #2 ("scam season, one year of data")
- Match promoted as the default search mode; activation holds under load
- Monthly willingness-to-pay review begins feeding the Q4 gate
**KPI targets:** 100+ new listings in the quarter ● ≥50% of listings get a qualified inquiry ≤14 days ● 60+ matches in the quarter ● referral share of new listings ≥20% ● zero paid spend maintained.
**S-curve position:** super-cycle at full ride; staging the May–Jun arrival pulse (renter-side content) + the monetization decision.

### Q4 — Apr–Jun 2027 (Months 10–12)

**Focus:** Harvest, decide, document.
**Time-shape:** tapering (~4 hrs/wk); founder attention shifts to the two decisions.
**Outcomes:**
- May–Jun arrival pulse served (summer interns/researchers searching); match stories published as the season's content harvest
- **Decision 1 — monetization gate (§8 Move 3):** GO → payments-on becomes a summer project targeting the 2027-28 cycle; NO-GO → documented rationale
- **Decision 2 — multi-campus:** only if liquidity targets hit — and the bar is a written, evidence-backed playbook (what worked, CAC≈$0 confirmed, rep model documented) before any second campus; recommendation is *at most* one adjacent Big Ten pilot for the Feb-2028 season, decided here, executed later
- Year-one retro: cross-episode return rate (did fall users come back in spring?), season-over-season match growth, full-funnel benchmarks — the baseline every future season beats
**KPI targets:** **100+ cumulative matches** ● cross-episode return measured ● unprompted-mention rate exceeding rep-driven mentions ● playbook document shipped.
**S-curve position:** arrival pulse riding; year-two curves (monetized season, possible second campus) staged as decisions with evidence, not bets.


---

## 11. Marketing operations stack

### The thesis

A solo founder cannot run acquisition, activation, retention, referral, content, SEO, and PR for a two-sided marketplace — with a traditional org, that's 6–10 people. Wroomly's answer is the one already proven in this engagement: **founder for decisions and human presence + agentic stack for everything executable in code, content, or analysis.** The past quarter is the evidence (see the concrete examples below): security audit with live exploit verification, full a11y remediation, UX audit-and-fix, AI-SEO implementation, and the community playbook — all shipped by the founder + agent pair at ~zero marginal cost. This plan is written to that operating model: every §4–8 move names its skill and tool.

### Skills mapped to AARRR stages (installed locally)

| Stage | Primary skills | Supporting skills |
|---|---|---|
| Acquisition | `community-marketing`, `content-strategy`, `ai-seo`, `seo-audit`, `public-relations` | `schema`, `directory-submissions`, `prospecting`, `social`, `copywriting`, `image`/`higgsfield-generate`, `competitor-profiling` |
| Activation | `onboarding`, `signup`, `cro`, `analytics` | `ab-testing`, `copywriting`, `marketing-psychology`, `copy-editing` |
| Retention | `emails`, `churn-prevention` | `copywriting`, `marketing-psychology` |
| Referral | `referrals` | `community-marketing`, `social`, `emails`, `copywriting` |
| Revenue | `pricing`, `offers` (Q4 gate only) | `customer-research` (signal log), `paywalls`+`ab-testing` (post-gate) |
| Cross-cutting | `product-marketing` (run next — see below), `customer-research`, `marketing-ideas`, `launch` | `copy-editing`, `lead-magnets` |

**Immediate follow-up:** run `product-marketing` to write `.agents/product-marketing.md` from §2 of this plan, so every future skill invocation starts with the same positioning/ICP/voice context instead of re-deriving it.

### MCPs / APIs mapped to stages

| Stage | Wired today | Not wired (flagged, with unlock) |
|---|---|---|
| Acquisition | GitHub (content ships as code), Google Search Console, browser automation (Playwright — citation checks, group monitoring) | Ahrefs/DataForSEO (skip — GSC suffices at this scale); Typefully (skip — IG/Reddit are manual by design) |
| Activation | Sentry MCP (activation-blocking errors), Supabase (funnel queries) | **PostHog or GA4 — the one wiring gap that matters; Week 1 priority (§13 #2)** |
| Retention | Supabase triggers/cron | **Resend (recommended) — Week 3 decision (§13 #1)**; Customer.io (skip — overkill at this scale) |
| Referral | Supabase (`?ref=` native) | Dub.co (skip — native param suffices) |
| Revenue | Stripe (built, gated) | Stripe MCP (wire only at Q4 gate) |
| Cross-cutting | Gmail MCP, Google Drive MCP, Sentry auto-fix pipeline (AGENTS.md) | Notion (not used) |

### Concrete examples (the stack already works — this quarter's receipts)

1. **AI-SEO cycle (2026-07-02/03):** audit → llms.txt + per-guide FAQPage schema + crawlability protection + a 14-file copy-accuracy sweep → verified against the running app → shipped to prod. Elapsed: ~2 sessions. Traditional equivalent: an SEO consultant engagement measured in weeks.
2. **Accessibility remediation:** 30+ WCAG violations across 17 routes → 0, audited with axe-core + browser automation, fixed, and verified — inside a week of sessions.
3. **Security hardening:** authenticated-email leak proven with a live two-user exploit probe, closed with column-level grants, and re-verified against production.

The pattern generalizes to every move in §4–8: the founder decides and shows up; the stack researches, writes, builds, and measures.

### Capability unlocks by funding stage

No raise is planned — the honest version of this table is **capability unlocks by calendar and decision**, not funding:

| Unlock trigger | What changes |
|---|---|
| Now (Paris, Tier 1) | Everything digital: launch, SEO/content, Reddit/FB, email spine, analytics — the full §9 W1–4 |
| Hugo returns to campus (~late Aug) | Physical layer: flyering, ambassador recruiting, tabling, in-person supply hustle |
| First matches exist (~Sep–Oct) | Story-driven marketing: match stories, share flows, Daily follow-up angle, testimonials |
| Liquidity proven (Q4 gate) | Monetization project (Stripe re-enable + copy re-sweep + lawyer review); multi-campus playbook consideration |
| (Hypothetical) any future raise | Paid pilot + campus-ops hire become options — out of scope for this plan; see funding-stage tiers in the skill reference if it happens |

### Team and agency model (RACI-style)

| Function | Strategic owner | Executed by |
|---|---|---|
| Growth (demand + supply engine) | Hugo | Claude stack (digital) + reps (campus) |
| Product marketing (story engine) | Hugo | Claude stack |
| Content (trust engine) | Hugo (direction) | Claude stack (production) |
| Campus distribution | Hugo | Reps (§7), founder-recruited |

No hire recommended in this horizon. If one ever becomes affordable/needed, it's a **Campus Ops Lead (Manager title)** — the only function the stack can't do is being physically in a GroupMe-dense student network year-round, and that's an operations role, not a marketing one. No agencies: nothing here benefits from one at this scale.


---

## 12. Tactical idea bank

Sections 4–8 prescribe what Wroomly *is doing*. This section cross-references all 139 ideas in the `marketing-ideas` library against what's *possible*, with a Wroomly-specific status. Two stage-filters do heavy lifting here: **paid anything is skipped on strategy** (CAC must be ≈$0 while LTV is $0 — §4), and **B2B/dev-tool/app-store mechanics don't apply** to a web-based campus marketplace. That makes the skip list long and the active list sharp — as intended for this stage.

**Status legend:** **Now (Q1)** — in the 90-day plan or runnable alongside · **Q2** — Oct–Dec layer-in · **Q3+** — peak-season / post-liquidity · **Q4+** — long-game · **Skip** — category, brand-voice, or business-model misfit.

### 12.1 Acquisition ideas

**Now (Q1):**

| # | Idea | Wroomly note |
|---|---|---|
| 1 | Easy Keyword Ranking | Long-tail UMich sublet queries — guides already target these; extend per §4 Move 2 |
| 2 | SEO Audit | Done this quarter; recurs quarterly (`seo-audit`) |
| 5 | Content Repurposing | Guides ↔ scam-alert carousels ↔ rep GroupMe blurbs — one production, three surfaces |
| 7 | Internal Linking | Guides ↔ neighborhood ↔ building pages; verify with quarterly audit |
| 10 | Parasite SEO | Reddit posts + FB group presence rank for campus queries Wroomly's domain can't yet |
| 12 | Marketing Jiu-Jitsu | The whole positioning: FB groups' scam problem is the story ("anti-scam, never anti-anyone") |
| 16 | Importers as Marketing | **Already built** — the AI listing importer is this idea, executed; make it the pitch everywhere |
| 35 | Community Marketing | docs/community-playbook.md — the plan's §4 Move 3 |
| 37 | Reddit Keyword Research | Mine r/uofm housing threads for guide topics + customer language |
| 38 | Reddit Marketing | Account aging July; founder post at launch; 5:1 ratio rule |
| 44 | Comment Marketing | The FB-group cross-post-offer habit is exactly this |
| 59 | Article Quotes (HARO) | Student-housing/scam queries; founder-as-source |
| 74 | Press Coverage | Michigan Daily scam-story pitch (§4 Move 4) |
| 115 | Curation as Marketing | Listing-of-the-week on Instagram |
| 121 | Guerrilla (lite) | Move-in flyering with QR — the physical layer, post-return |

**Q2:**

| # | Idea | Wroomly note |
|---|---|---|
| 8 | Content Refreshing | Re-date + update guides each season (deposit law, prices) |
| 40 | Instagram Audience | Cadence stabilizes Sept; trust channel, not growth channel |
| 98 | Template Marketing | **Free Michigan sublease-agreement template** (draft exists in legal work; lawyer-reviewed) — the highest-intent lead magnet possible (`lead-magnets`) |
| 102 | Social Screenshots | Match-story screenshots (permissioned) as IG/rep content |
| 106 | End-of-Year Wraps | December "first semester in review" if numbers are proud-worthy |

**Q3+:**

| # | Idea | Wroomly note |
|---|---|---|
| 3 | Glossary Marketing | Renter-terms glossary (sublease vs. relet, joint liability) — SEO long-tail |
| 6 | Proprietary Data Content | First-party scam-pattern + pricing data becomes citable content |
| 9 | Knowledge Base SEO | Support questions → FAQ pages (§6 Move 4 feeds this) |
| 15 | Engineering as Marketing | **Scam-listing checker** (paste a listing/photo, get red-flag analysis) — peak-season tool |
| 18 | Calculator Marketing | "What should my sublet rent be?" estimator from listing data |
| 58 | Newsletter Swaps | Campus org newsletters (club sports, Greek life) — via reps |
| 64 | Community Sponsorship | Small club-event sponsorship from swag budget, rep-brokered |
| 84 | Giveaways | Move-in giveaway with reps — cautious, trust-first framing |
| 116 | Grants as Marketing | **UMich optiMize / CFE student-venture grants** — money + campus press + credibility in one |
| 100 | Promo Videos | 60-sec importer demo once match stories give it proof |

**Q4+:**

| # | Idea | Wroomly note |
|---|---|---|
| 105 | Annual Reports | "State of UMich Subletting" — data moat + Daily story + AI-citation magnet |
| 120 | Marketing Stunts | Only with a trust-compatible concept (e.g., "scam house" art installation at Festifall) |

**Skip (with rationale):**

| # | Ideas | Rationale |
|---|---|---|
| 23–34 | All paid ads (podcast, pre-targeting, FB/IG/X/LinkedIn/Reddit/Quora/Google/YouTube ads, retargeting, click-to-messenger) | Strategy, not budget: $0 LTV makes any CAC>0 uneconomic; 50k addressable students reachable free |
| 4 | Programmatic SEO | Already executed at the right scale (neighborhood/building pages); national scale = multi-campus, out of scope |
| 11, 13 | Competitor comparison pages, competitive ad research | Competitor is Facebook groups — no SERPs to fight, no ads to research; the "safe alternative" story lives in guides instead |
| 14, 17, 19–22 | Side projects, quizzes, Chrome ext, microsites, scanners, public APIs | Founder-time misfit or category misfit (scanner-adjacent idea lives on as #15's scam checker) |
| 36 | Quora | Students aren't there; Reddit is the venue |
| 39, 41, 42, 43 | LinkedIn, X audience, short-form video, engagement pods | Wrong platforms for campus reach (42 revisit only if a rep owns it); pods off-brand |
| 49 | Monthly newsletter | Nothing monthly to say pre-liquidity; seasonal cadence is the honest one (§6) |
| 54–57, 60–63 | Affiliate discovery, influencer whitelisting, resellers, expert networks, pixel sharing, shared Slack, integrations | B2B/paid mechanics with no fit |
| 65–73, 75–76 | Webinars, summits, roadshows, meetups, conference plays, media acquisitions, fundraising PR, documentaries | Scale/stage misfit; not raising |
| 77, 80–83, 85–86 | BFCM/New-Year promos, early-access pricing, PH + alternatives, Twitter giveaways, vacation giveaways, lifetime deals | Nothing to discount/price; PH audience ≠ UMich students; giveaway variants off-voice |
| 78 | Product Hunt | The Michigan Daily is Wroomly's Product Hunt |
| 87–89 | Powered-by, free migrations, contract buyouts | SaaS/B2B mechanics (migration's spirit already shipped as the importer, #16) |
| 97, 99, 101, 103–104, 107–108 | Playlists, graphic novel, industry interviews, courses, book, podcast, changelogs | Format misfits for stage/audience |
| 110–113, 117–119, 122–123, 125–128, 130–131, 136, 138 | Awards, challenges, reality TV, controversy, product competitions, Cameo, OOH, humor-as-strategy, open source, app marketplaces, YouTube plays, source platforms, live audio, international, DevRel, podcast tours | Category/brand/stage misfits (flyers already cover OOH's local job; light humor lives inside the voice, not as a strategy) |
| 129 | Review Sites | No G2/Capterra equivalent for campus sublets; the "review site" is r/uofm word-of-mouth — covered by #38 |
| 133 | Investor Marketing | Not raising |

### 12.2 Activation ideas

| # | Idea | Status | Wroomly note |
|---|---|---|---|
| 96 | Onboarding Optimization | **Now** | §5 Moves 3–4 — importer-first supply path, first-session demand audit |
| 90 | One-Click Registration | **Now (adapted)** | Minimize everything *around* the @umich.edu verification — the friction that stays is the moat |
| 95 | Concierge Setup | **Now (adapted)** | Wroomly Match *is* demand-side concierge; founder white-gloves the first 30 listers |
| 51 | Onboarding Emails | **Now** | §6 Move 1 spine (welcome + draft reminder) |
| 47 | Founder Welcome Email | **Q1** | Personal, named, replies-welcome — support-as-marketing from day one |
| 48 | Dynamic Email Capture | **Q2** | Match chat already captures; extend to guide-page template download (#98) |
| 91 | In-App Upsells | Skip | Nothing to upsell until monetization gate |
| 124 | App Store Optimization | Skip | No native app |

### 12.3 Retention ideas

| # | Idea | Status | Wroomly note |
|---|---|---|---|
| 50 | Inbox Placement | **Now** | SPF/DKIM before launch — activation-critical here (§5 Move 2) |
| 46 | Reactivation Emails | **Q2** | Seasonal wake-ups (Oct "list before you leave", Jan "search season") |
| 52 | Win-back Emails | **Q2 (merged with #46)** | Dormancy is expected; win-back = seasonal calendar triggers, not churn saves |
| 94 | Offboarding Flows | **Q2** | Episode-close flow (§6 Move 3): congratulate, capture story, go quiet |
| 135 | Support as Marketing | **Now** | Founder-direct, same-day, every confusion → guide/FAQ |
| 45 | Mistake Email Marketing | Opportunistic | If a mistake happens, own it in voice |
| 53 | Trial Reactivation | Skip | No trial construct |
| 134 | Certifications | Skip | No certification-shaped surface |

### 12.4 Referral ideas

| # | Idea | Status | Wroomly note |
|---|---|---|---|
| 79 | Early-Access Referrals | **Q3** | Priority-Match placement as the (small, disclosed) incentive |
| 137 | Two-Sided Referrals | **Q3** | §7 Move 4 — demand recruits supply during peak season |
| 62 | Affiliate Program | Skip | No revenue to commission; ambassador model instead |
| 92 | Newsletter Referrals | Skip | No newsletter (see #49) |
| 93 | Viral Loops | Skip | Housing is too high-stakes for engineered virality; earned WOM instead |

### 12.5 Revenue ideas

| # | Idea | Status | Wroomly note |
|---|---|---|---|
| 91 | In-App Upsells | Skip (until gate) | Re-evaluate at Q4 monetization decision |
| 132 | Price Localization | Skip | Single hyper-local market |
| 86 | Lifetime Deals | Skip | Nothing priced; would poison a future pricing story anyway |

### 12.6 Cross-cutting / brand foundation

| # | Idea | Status | Wroomly note |
|---|---|---|---|
| 139 | Customer Language | **Now** | Mine Match chats + FB/Reddit threads; feed copy and guide topics (`customer-research`) |
| 114 | Moneyball Marketing | **Now (methodology)** | Weekly source-attributed dashboard (§13) is the practice |

### Idea-bank summary

- **Active: 45** — Now 22 · Q2 8 · Q3+ 12 · Q4+ 2 (one idea, #16, is already shipped as product)
- **Skipped: ~94** — dominated by paid ads (strategic), B2B/SaaS mechanics (category), and scale-stage plays (timing)
- The plan runs **~32% of the available tactical surface area** — right for a solo, pre-launch, $0-CAC operation. The Q3+/Q4+ columns are the pre-loaded backlog: peak season and the annual-report/data-moat plays are already named, so scaling activity later means promoting rows, not re-strategizing.
- What the skip list proves: Wroomly's constraint isn't idea supply — it's founder hours and the campus calendar. The bank exists so no future "should we try X?" conversation starts from zero.


---

## 13. Measurement, RACI, open decisions, appendix

### Measurement — the metrics that matter

**North star (proposed): confirmed matches per season.** A "match" = an inquiry accepted by the lister **and** contact exchanged (pending founder ratification — open decision #3). This is the liquidity thesis in one number; revenue is $0 by design, so matches are the year's currency. Seasonal framing (not monthly) because the campus calendar pulses — compare season-over-season, not month-over-month.

**Supporting liquidity ratio:** % of live listings receiving ≥1 qualified inquiry within 14 days. A marketplace where listings go quiet is dead even if cumulative matches look fine.

**Leading indicators by stage:**

| Stage | Leading indicators |
|---|---|
| Acquisition | New listings/wk by source (`?ref=`, reddit, fb, flyer-QR, direct, seo) · demand signups/wk by source · GSC impressions on guide queries · AI-citation checks (monthly, 10 queries) |
| Activation | Signup→verified rate (≥95%) · started→published listing rate (≥60% importer path) · first-session artifact rate (inquiry/alert/saved search) |
| Retention | Inquiry-alert delivery lag (minutes) · episode completion (searcher active-or-matched at wk 3) · seasonal wake-up reactivation rate |
| Referral | Referred share of new listings (Q3 target ≥20%) · organic match-story share rate · unprompted mentions/wk (logged manually — celebrate each) |
| Revenue | Willingness-to-pay signal log entries/mo (§8 Move 2) — the only revenue metric until the Q4 gate |

**Review cadence:**
- **Weekly (10 min, founder + stack):** the §8/community-playbook dashboard — listings by source, signups by source, funnel rates, matches. Runs as a standing agent query against Supabase/PostHog.
- **Monthly:** rep attribution + AI-citation check + willingness-to-pay log review.
- **Quarterly:** plan recalibration against §10 KPI targets; rubric re-score (did the 31/85 shape move?); seasonal retro after each pulse.

### RACI

| Domain | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Strategy + this plan | Hugo | Hugo | Claude stack | — |
| Brand voice (§2) | Claude stack (enforcement) | Hugo | — | Reps |
| Product/site implementation | Claude stack | Hugo | — | — |
| SEO/content production | Claude stack | Hugo | — | — |
| Lifecycle email | Claude stack | Hugo | — | — |
| Reddit/FB presence | Hugo | Hugo | Claude stack (drafts) | — |
| Instagram | Claude stack (content) | Hugo (approval) | Reps (reposts) | — |
| Ambassadors | Hugo | Hugo | — | Claude stack (kit + attribution) |
| Press (Daily) | Hugo | Hugo | Claude stack (materials) | — |
| Analytics + dashboard | Claude stack | Hugo | — | — |
| Legal/compliance surfaces | Lawyer (gated items) | Hugo | Claude stack | — |
| Monetization gate (Q4) | Hugo | Hugo | Claude stack (data) | — |

### Open decisions blocking the plan (ranked by impact)

1. **Definition of "match."** Blocks the north star and every §10 target. Recommend: inquiry accepted + contact exchanged, evented in code. *(Decide Week 1.)*
2. **Analytics: PostHog vs. GA4.** Blocks all funnel measurement. Recommend PostHog (free tier, funnels + session replay, no cookie-banner complexity beyond current). *(Decide Week 1.)*
3. **Email provider: Resend vs. Customer.io.** Blocks the §6 retention spine. Recommend Resend. *(Decide Week 3.)*
4. **Launch go-dates.** Supply-only flip (July) and full-launch date (pre-move-in August) — both founder calls; every §9 week number keys off them.
5. **Fall time budget.** §10 assumes ~5 hrs/wk (8–10 in Feb–Mar). If classes make that unrealistic, reps must carry more and targets adjust — say so early.
6. **Privacy-policy escrow edit + sublease-template review** — the two lawyer-gated items (docs/legal-checklist.md); template also gates idea #98.
7. **UMich official-channel posture.** Housing office / orgs / optiMize: pursue partnerships-and-grants, or stay unofficial? Affects Q3+ ideas (#58, #64, #116).
8. **Monetization gate criteria.** §10 Q4 names the decision; pre-agreeing the numeric bar (e.g., ≥100 matches + ≥50% liquidity ratio) now prevents moving goalposts later.

### Appendix — deep-dive links

**In the product repo (shared):**
- `docs/community-playbook.md` — §4/§7 execution spec (channels, reps, rituals, rules of engagement)
- `docs/legal-checklist.md` — launch-gating legal items
- `docs/recurring-rent-design.md` — parked monetization architecture (input to §8 gate)
- `AGENTS.md` — Sentry auto-fix pipeline + operating rules

**This engagement (local to founder's machine):**
- Marketing-plan folder: research record, per-section sources, this plan
- Prior cycle outputs live in the repo's git history: security hardening (migration 029), a11y remediation, AI-SEO implementation (llms.txt, FAQPage schema), copy-accuracy sweep

**To be created (named in plan):**
- `.agents/product-marketing.md` (§11 — run `product-marketing` next)
- Rep kit (talking points, blurbs, ref links) — §7, Weeks 5–8
- Peak-season war plan — §10 Q2, December

---

*Wroomly Marketing Plan v1. Prepared by Claude (fCMO engagement), 2026-07-03. For founder review — say "redo section N" to re-open any section.*
