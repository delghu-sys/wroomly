# Pre-launch Audit — 2026-07-04 (branch: hardening/pre-launch)

Ranked by impact on the two conversion events that matter: **a listing gets
created** and **a search completes → inquiry sent**. Each finding has a fix
status tracked in this doc as the branch progresses.

## STATUS (end of hardening pass — same day)

Every item below is **FIXED on this branch** except where noted. Verified:
tsc clean · lint 0 errors · build green · unit 50/50 · e2e 29/30 (the one
red is item 18's detector — goes green when migration 032 is applied).
The import happy path was proven END-TO-END against a production build:
signed target → direct browser-style storage PUT → server path verification
→ real AI extraction (21s) → awaiting_admin_review, with replay 409.

**Two additional live-production bugs discovered during verification:**

### 17. 🔴 (NEW) Sentry browser tunnel auth-gated — anonymous client errors never reported
The middleware auth-gates `/monitoring` (the Sentry tunnelRoute), so error
envelopes from logged-out visitors were redirected to /sign-in and dropped.
Client-side errors from anonymous users — most launch traffic — have never
reached Sentry. **Fixed**: `/monitoring` early-return + supply-only allow.

### 18. 🔴 (NEW) Profile editing broken in production since migration 029
The users-update policy (008) enforces trust-column immutability via WITH
CHECK subqueries that SELECT `email`/`stripe_customer_id`/`stripe_account_id`
as the calling role — exactly the columns 029 revoked. Every profile update
(bio, name, phone, avatar) fails with "permission denied". Confirmed live
with a throwaway user; caught by tests/e2e/security.spec.ts. **Fix ready:
`supabase/migrations/032_users_update_column_grants.sql` — PASTE ASAP**
(no code deploy needed; column-level UPDATE grants replace the subqueries).

**Founder actions required (dashboard-only):**
1. Paste migration **032** (fixes live profile editing — do this first)
2. Paste migration **031** (analytics_events — funnel instrumentation)
3. Migration 030 (signup_source) if not yet pasted
4. Merge this branch → deploy (upload fix, tunnel fix, everything else)

## P0 — Conversion-blocking (launch-gating)

### 1. 🔴 Import uploads >4.5MB die at Vercel's edge — the flagship flow is broken for real phone photos
**Verified live against production:** a 6MB POST to `/api/listing-imports`
returns `HTTP 413 FUNCTION_PAYLOAD_TOO_LARGE` before our code runs. Vercel
caps serverless request bodies at ~4.5MB; the form advertises "up to 10 ·
images 8MB, PDFs 25MB" — physically impossible through this pipe. **Two
normal iPhone photos (~3MB each) break the import**, and the user sees only
the generic catch-all error. The review-time photo endpoint
(`/api/listing-imports/photos`) has the same problem.
**Fix:** client-side image downscaling (~1600px WebP, ≈300–500KB/photo) +
direct-to-storage uploads via Supabase signed upload URLs (bypasses the
Vercel body cap entirely; also the only way 25MB PDFs can ever work). Same
transport for both endpoints. This also serves the "<60s on mobile" goal:
compressed files upload ~10× faster on LTE.

### 2. 🔴 Middleware auth-gates Vercel Analytics (`/_vercel/*`) — pageview tracking dead + console noise
Observed in the prod-build mobile pass: `/_vercel/insights/script.js` is
redirected to `/sign-in` (MIME error, script never loads) and insight POSTs
405. The middleware matcher never excludes `/_vercel`. Pageview analytics
added this week likely records nothing in production.
**Fix:** exclude `_vercel` in the middleware matcher (Vercel's documented
requirement).

### 3. 🟠 ClaimReview default photo selection silently never works
Default-selected photos are matched by comparing the **extraction-time signed
URL** (stored in the draft) against **freshly minted signed URLs** (new
signature every page load) — never equal, so AI-approved housing photos
always render dim/unselected and the user must re-tap every photo. Confusing,
and one more chance to abandon at the publish step.
**Fix:** match by storage path (stable), not signed URL.

### 4. 🟠 Claim/publish race → spurious "You don't have access" dead end
The claim POST fires un-awaited on mount with errors swallowed; publish
requires `claimed_by_user_id === user.id`, so a fast user (or a failed claim)
hits a 403 dead end.
**Fix:** publish auto-claims when the draft is unclaimed; surface claim
failure in the UI instead of swallowing it.

## P1 — Funnel robustness

### 5. 🟠 Import submit UX: one spinner for a 20–60s request; file picking replaces prior batch
No staged progress ("uploading → reading → drafting"), no thumbnails, no
per-file remove, and picking files a second time **replaces** the first
selection (mobile users batch-pick from camera roll). All of it invites
abandon/retry mid-flight.
**Fix:** append + removable thumbnails; staged progress tied to the new
two-phase upload; compression progress per file.

### 6. 🟠 Sentry is 100% noise — real launch-day errors would drown
All 6 unresolved issues are non-bugs: 4× a browser extension parsing our
JSON-LD (`r["@context"].toLowerCase` — including the two flagged on
/claim-listing and /import-listing), 1× someone's dev server without env
vars, 1× client-aborted request. The flows themselves are fine (verified in
code + browser).
**Fix:** `ignoreErrors` + third-party frame filtering + drop non-production
environments; then the dashboard means something on launch day.

### 7. 🟡 Import success screen is a dead end (no next action)
### 8. 🟡 Open-ended sublets can't publish — validator supports `openEnded`, no UI ever sets it
### 9. 🟡 Publish TOCTOU: a double-tap/retry can create two listings (no atomic listing_id guard)

## P2 — Hardening

### 10. 🟡 Missing input caps
Inquiry message: min 20 chars, **no max** (client inserts straight to DB via
RLS — a 5MB message is accepted). Messages composer: no maxLength.
ClaimReview numeric fields unbounded — rent 10^9 passes the publish gate and
`× 100` lands in an int4 column → 500 on publish.
**Fix:** sane caps client + server (rent/deposit ≤ $50k, bedrooms/bathrooms
≤ 20, message ≤ 5k chars, title/description caps on publish).

### 11. 🟡 `/api/listing-imports/photos` has no rate limit (auth + token gated, so low risk — add a light cap for storage abuse).

### 12. 🟢 Security posture otherwise strong (verified this pass + prior cycles)
Admin/cron/notify-created routes authenticate correctly; no
`dangerouslySetInnerHTML` outside the escaped JsonLd; `.or()` injection
already fixed; import source files in a private bucket behind signed URLs;
claim tokens stored hashed with expiry; publish gate re-run server-side;
column-level grants live (migration 029). Rate limits exist on the two
expensive public endpoints (imports, match chat).

## P3 — Mobile / perf / a11y / SEO / instrumentation

### 13. 🟢 Mobile layout: no horizontal overflow on any funnel page (390px, prod build, verified with screenshots). Minor: ~16 small tap targets (<32px) on /guides and /about — footer/inline links; polish, not blocking.
### 14. 🟢 SEO baseline solid — canonicals everywhere (users/[id] fixed 07-03), sitemap, robots, schema, llms.txt.
### 15. 🟡 Zero funnel instrumentation — drop-off between import → claim → publish → inquiry is invisible. Vercel Analytics custom events need a paid plan; the stack decision (first-party, 07-03) extends naturally: tiny `analytics_events` table + rate-limited `/api/events` + `track()` helper; `npm run metrics` gains a funnel section.
### 16. 🟡 Tests: no coverage on the money flows. Existing: e2e smoke/auth/security/a11y + unit (import schema, match). Missing: publish-validation unit tests, claim/publish route logic, import form validation e2e, search/filter e2e.

## Fix order (Phase 2)
2a → items 1, 2, 3, 4, 6 · 2b → 5, 7, 8, 9 · 2c → 10, 11 · 2d → 13 polish +
image/perf spot-checks · 2e → 15 · 2f → 16.
