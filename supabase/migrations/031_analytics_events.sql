-- ─────────────────────────────────────────────────────────────────────────────
-- 031_analytics_events.sql
--
-- First-party funnel events (docs/prelaunch-audit.md item 15). The listing
-- funnel (import → claim → publish → inquiry) currently has zero drop-off
-- visibility; Vercel Web Analytics custom events need a paid plan, and the
-- stack decision (2026-07-03) is first-party measurement. Tiny append-only
-- table, written by /api/events via the service role, read by
-- `npm run metrics`.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists analytics_events (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null check (char_length(name) <= 60),
  props      jsonb not null default '{}'::jsonb,
  -- Anonymous per-tab session id (crypto.randomUUID(), sessionStorage) so
  -- funnel steps can be joined without any account or cookie identity.
  session_id text check (session_id is null or char_length(session_id) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_created_idx
  on analytics_events (name, created_at desc);

-- Service-role only: no client reads or writes, ever.
alter table analytics_events enable row level security;
revoke all on analytics_events from anon, authenticated;
