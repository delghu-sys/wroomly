-- ─────────────────────────────────────────────────────────────────────────────
-- 026_wroomly_match.sql
--
-- Wroomly Match: a renter describes what they want via a short AI chat, opts in
-- with their email, and gets notified when a matching listing is posted. This is
-- the renter-facing, AI-driven sibling of saved_searches (013) — but anonymous
-- (no account) and keyed on a self-supplied email, so all access goes through
-- tokenized API routes using the service role.
--
-- CAN-SPAM: the email is opt-in (user types it), every send carries an
-- unsubscribe + manage link, and unsubscribing flips status so the engine never
-- emails them again. We never email an address that isn't an 'active' alert.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists match_alerts (
  id              uuid primary key default uuid_generate_v4(),
  -- The address the user typed themselves (opt-in). Dedupe is case-insensitive
  -- via the unique index below.
  email           text not null,
  -- Structured housing-preference profile parsed from the chat. Shape mirrors
  -- listing columns + existing enums (ANN_ARBOR_NEIGHBORHOODS, AMENITIES) so
  -- matching lines up 1:1. JSONB so we can evolve the shape without a migration.
  criteria        jsonb not null default '{}'::jsonb,
  -- The raw chat transcript — kept for the manage-page re-edit and for tuning
  -- the questioning prompt later.
  transcript      jsonb not null default '[]'::jsonb,
  status          text not null default 'active'
                    check (status in ('active', 'paused', 'unsubscribed')),
  frequency       text not null default 'instant'
                    check (frequency in ('instant', 'daily')),
  -- Random token (see crypto.randomBytes in the API) powering /match/manage and
  -- one-click unsubscribe with no login.
  manage_token    text not null unique,
  -- Single opt-in: set at creation. Kept as a column so we have an explicit
  -- consent timestamp on record for compliance.
  confirmed_at    timestamptz,
  -- Linked only when a logged-in user happens to create one; null for anon.
  user_id         uuid references users(id) on delete set null,
  source          text,
  -- Bookkeeping for the daily-digest window.
  last_matched_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One active opt-in per email (case-insensitive); re-submits update in place.
create unique index if not exists match_alerts_email_uq
  on match_alerts (lower(email));
create index if not exists match_alerts_status_idx
  on match_alerts (status) where status = 'active';

-- Dedupe ledger ("AlertMatch"): records every (alert, listing) we've emailed so
-- a renter is never sent the same listing twice. The unique constraint is the
-- guarantee — the dispatcher inserts before/with the send.
create table if not exists match_alert_sends (
  id          uuid primary key default uuid_generate_v4(),
  alert_id    uuid not null references match_alerts(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  score       numeric,
  emailed_at  timestamptz not null default now(),
  unique (alert_id, listing_id)
);

create index if not exists match_alert_sends_alert_idx
  on match_alert_sends (alert_id);

-- Reuse the shared updated_at trigger from 001.
create trigger match_alerts_updated_at
  before update on match_alerts
  for each row execute function update_updated_at();

-- Service-role only: no policies on purpose (same posture as renter_waitlist).
-- Every read/write happens in API routes via the service client, gated on the
-- manage_token, never on a Supabase session.
alter table match_alerts enable row level security;
alter table match_alert_sends enable row level security;
