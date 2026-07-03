-- ─────────────────────────────────────────────────────────────────────────────
-- 030_signup_attribution.sql
--
-- First-touch source attribution for the liquidity dashboard ("listings by
-- source is THE number" — docs/marketing-plan.md §13). The middleware drops a
-- 30-day first-touch cookie when a visitor lands with ?ref= (ambassador
-- links, flyer QRs) or ?utm_source= ; /callback copies it onto the users row
-- at first login. Listings/inquiries attribute by joining through their
-- creator, so no column is needed there. renter_waitlist.source and
-- match_alerts.source already exist (020/026) for pre-signup demand capture.
--
-- Not granted to authenticated for SELECT (029 pattern: additive column
-- grants only) — attribution is read by service-role analytics only.
-- ─────────────────────────────────────────────────────────────────────────────

alter table users
  add column if not exists signup_source text
  check (signup_source is null or char_length(signup_source) <= 64);

comment on column users.signup_source is
  'First-touch acquisition source (?ref= / ?utm_source=), set once at account creation by /callback. Values like "flyer-diag", "rep-<name>", "reddit".';
