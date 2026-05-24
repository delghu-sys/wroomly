-- ─────────────────────────────────────────────────────────────────────────────
-- 013_saved_searches.sql
--
-- "Save this search" lets a consumer pin their current filter combo and
-- (optionally) get an email when new listings matching it post. Drives
-- retention — a student who didn't find anything on day 1 gets pulled
-- back when day-7's listings drop.
--
-- Filters stored as JSONB so we can evolve the filter shape without
-- another migration. The cron that fires alerts reads the JSON, builds
-- a Supabase query in Node, and emails the user new matches since
-- last_alerted_at.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists saved_searches (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references users(id) on delete cascade,
  -- Friendly label the user can name ("Summer 2027 near campus"), or NULL
  -- to auto-render from the filter values.
  name               text,
  -- Filter combo as JSONB. Keys mirror URL search params on /listings:
  --   { q, type, neighborhood, property_type, residence_name,
  --     min_price, max_price, bedrooms, available_from,
  --     furnished, pets }
  -- Empty {} means "all listings".
  filters            jsonb not null default '{}'::jsonb,
  email_alerts       boolean not null default true,
  -- The last time the alert cron checked this saved search.
  -- New matches are listings.created_at > last_alerted_at.
  last_alerted_at    timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

alter table saved_searches enable row level security;

create policy "Users manage own saved searches"
  on saved_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists saved_searches_user_idx
  on saved_searches (user_id);

-- Used by the alert cron to find the candidates for "any new matches?"
create index if not exists saved_searches_email_alerts_idx
  on saved_searches (email_alerts, last_alerted_at)
  where email_alerts = true;
