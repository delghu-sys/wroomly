-- ─────────────────────────────────────────────────────────────────────────────
-- 028_match_rate_limit.sql
--
-- Anti-abuse for the PUBLIC, ANONYMOUS Wroomly Match endpoints. /api/match/chat
-- and /api/match/criteria call the Anthropic API with no account and no
-- throttle; /api/match/alerts sends a welcome email to any address a caller
-- types in. Left uncapped, either is a cheap way to (a) run up an unbounded
-- Anthropic bill or (b) email-bomb a victim / torch our sending-domain
-- reputation.
--
-- This mirrors the circuit-breaker the AI Listing Importer already uses
-- (/api/listing-imports counts recent request rows to bound total AI cost).
-- Chat/criteria write no domain rows to count against, so this table is the
-- lightweight ledger the limiter counts: one row per allowed request, counted
-- within a sliding window. Rows are ephemeral (only ever counted over the last
-- hour) — a daily prune keeps the table tiny.
--
-- RLS-locked with NO policies: only the service role (which bypasses RLS)
-- reads/writes it, exactly like renter_waitlist. Additive; nothing else
-- depends on it.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists match_rate_events (
  id         bigint generated always as identity primary key,
  -- Which endpoint the hit was for: 'chat' | 'criteria' | 'alerts'.
  bucket     text not null,
  -- Optional per-subject key for a narrower cap (e.g. the target email on
  -- /api/match/alerts, so one victim can't be repeatedly emailed). Null for
  -- global-only buckets.
  identifier text,
  created_at timestamptz not null default now()
);

-- Global sliding-window count: WHERE bucket = ? AND created_at > ?.
create index if not exists match_rate_events_bucket_time_idx
  on match_rate_events (bucket, created_at desc);

-- Per-subject sliding-window count: WHERE bucket = ? AND identifier = ? AND …
create index if not exists match_rate_events_identifier_time_idx
  on match_rate_events (bucket, identifier, created_at desc)
  where identifier is not null;

alter table match_rate_events enable row level security;
-- No policies on purpose: anon/authenticated get nothing; the service role
-- bypasses RLS. The public key can neither read nor write this ledger.
revoke all on match_rate_events from anon, authenticated;
