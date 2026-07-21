# Security Audit — 2026-07-21

Full audit of michigan-nest (RLS, IDOR/authz, auth, tokens, secrets, Stripe,
injection/XSS, AI importer, SSRF, rate limiting, PII, headers, deps). Method:
read every policy + route, then **empirically attack prod** with three
throwaway users (A supplier, B/C consumers) using their real JWTs against
PostgREST — the same path the browser client uses — plus `npm audit`.

Branch: `security/audit`. Regression suite: `tests/e2e/security-rls.spec.ts`.
Fixes: migration `038_security_audit_fixes.sql` + `npm audit fix`.

## Findings & status

| # | Sev | Finding | File | Status |
|---|-----|---------|------|--------|
| C1 | Critical | Inquiry INSERT policy self-references `inquiries` (rate-limit count) → 42P17 recursion; **every renter inquiry 500s**. Latent (supply-only pre-launch). | `023_inquiry_rate_limit.sql` | **Fixed** (038: SECURITY DEFINER count fn) |
| H1 | High | Consumer can PATCH own inquiry `status→accepted`; the messages page reveals the counterpart's **email+phone** when `accepted` → a consumer harvests any supplier's contact PII without consent. | `001` policy + `messages/[id]/page.tsx:160` | **Fixed** (038: consumer update `with check status='withdrawn'`) |
| M1 | Medium | `listing_images` / `listing_amenities` / `swap_preferences` had `select using(true)` → anon reads image paths/amenities/swap of hidden (draft/archived) listings. | `001_initial_schema.sql` | **Fixed** (038: SELECT scoped to parent listing visibility) |
| M2 | Medium | `npm audit` high: `brace-expansion` DoS (build-tooling dep). | package-lock | **Fixed** (`npm audit fix`) |
| L1 | Low | `user_photos` `select using(true)` — anon can enumerate profile photos. | `002_social_profiles.sql` | **By design** — profiles are public (`/users/` is a public route); the data is already visible on the public profile. No fix. |
| L2 | Low | `npm audit` moderate: `postcss` XSS inside Next's deps. | node_modules/next | **Accepted** — not runtime-exploitable; the fix downgrades Next. Track. |
| L3 | Low | CSP is report-only, not enforcing. | `next.config.ts` | **Accepted** — documented posture; enforce later. |

### Before/after evidence (C1/H1/M1, live prod probes)

- **C1 before:** `POST /rest/v1/inquiries` (consumer JWT) → `500 {"code":"42P17","message":"infinite recursion detected in policy for relation \"inquiries\""}`. **After:** insert 201; 15/hr cap still enforced via `recent_inquiry_count()`.
- **H1 before:** consumer `PATCH inquiries?id=… {"status":"accepted"}` → `204`, row became `accepted`. **After:** row stays non-accepted; supplier accept still works; consumer withdraw still works.
- **M1 before:** anon `GET listing_images?listing_id=<archived>` → returned the row. **After:** `[]` for hidden listings; active-listing images unaffected.

## Confirmed SECURE (attacks that failed)

RLS enabled on all 23 tables. Cross-user profile read/write **blocked**;
self-escalation to `admin`/`is_verified` **blocked** (column grants). Listings:
cross-user read(draft)/update/delete **blocked**; owner self-activation blocked
by trigger (037). Messages/conversations: unrelated user cannot read/inject/
spoof; participants read their own. Favorites, saved-searches, transactions:
per-user isolated. Secrets: no client leakage, no hardcoded keys, no tracked
`.env`. Stripe: webhook signature verified; amounts/fees computed server-side
from the DB (no client price trust). Tokens: 256-bit `randomBytes`; claim
tokens SHA-256-hashed at rest + 7-day TTL. No SSRF (import URLs stored, not
fetched); AI output Zod-validated + user-confirmed. XSS: only the JSON-LD sink,
which escapes `<`. Enumeration: generic sign-in error; waitlist reveals nothing.
Security headers (HSTS, X-Frame-Options DENY, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy) present.

## To deploy

1. Paste `supabase/migrations/038_security_audit_fixes.sql` in the Supabase SQL
   editor (fixes C1/H1/M1 in one shot).
2. Deploy the branch (package-lock from `npm audit fix`).
3. Run `npx playwright test tests/e2e/security-rls.spec.ts --workers=1` — all
   green proves the fixes and the cross-user isolation matrix.
