-- ─────────────────────────────────────────────────────────────────────────────
-- 027_match_weighted_profiles.sql
--
-- Wroomly Match v2: the chat becomes a real concierge that produces a WEIGHTED
-- preference profile (importance weights per attribute, ranked top-3
-- priorities, dealbreakers, flexibility ranges) instead of flat filters, and
-- every emailed match records its score, machine-readable fit/miss reasons,
-- the LLM-written personal note, and the renter's thumbs feedback.
--
-- Additive only. The v1 `criteria` column stays untouched as a rollback path;
-- the app reads `profile` and falls back to a criteria-derived default profile
-- for any alert created before this migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- Weighted profile produced by the concierge chat (shape: MatchProfile in
-- src/types/database.ts, validated by src/lib/match/profile.ts). JSONB so the
-- shape can evolve without further migrations; '{}' = "not yet profiled".
alter table match_alerts
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- Match record upgrades. match_alert_sends already IS the per-(alert, listing)
-- match ledger with the dedupe unique constraint — extend it rather than
-- adding a parallel table.
alter table match_alert_sends
  -- Machine-readable scoring output: [{ kind: 'fit'|'miss', attr, detail }].
  add column if not exists reasons jsonb not null default '[]'::jsonb,
  -- The LLM-written personal note that went into the email (audit + manage UI).
  add column if not exists note text,
  -- Groups the rows of one ranked digest email ("your top 3"); null = instant.
  add column if not exists digest_key text,
  -- Renter reaction from the email's thumbs buttons. Last write wins.
  add column if not exists feedback text
    check (feedback in ('up', 'down')),
  add column if not exists feedback_at timestamptz;

-- The manage page lists an alert's sent matches newest-first.
create index if not exists match_alert_sends_alert_emailed_idx
  on match_alert_sends (alert_id, emailed_at desc);
