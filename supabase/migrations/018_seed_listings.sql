-- ─────────────────────────────────────────────────────────────────────────────
-- 018_seed_listings.sql
--
-- Launch seed-listing system. Adds provenance columns to `listings` so we can
-- distinguish real user supply from imported "seed" listings (and tear the
-- seeds down cleanly later), plus a `seed_inquiry` waitlist table so inquiries
-- on seed listings are captured honestly instead of faking a "message sent to
-- landlord" conversation.
--
-- Seed listings themselves are inserted by scripts/importSeed.mjs via the
-- service-role client (which bypasses RLS), owned by a dedicated system user
-- the importer provisions. Nothing here grants users the ability to create
-- seed rows from the browser.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Provenance columns on listings.
do $$ begin
  create type listing_source as enum ('user', 'seed');
exception when duplicate_object then null;
end $$;

alter table listings
  add column if not exists source      listing_source not null default 'user',
  add column if not exists source_name text,
  add column if not exists source_url  text;

-- Idempotency key for the importer: it re-runs by matching (address, price)
-- among seed rows. Partial index keeps it scoped to seeds and cheap.
create index if not exists listings_seed_dedupe_idx
  on listings (address, price_per_month)
  where source = 'seed';

-- Quick filter for the admin live-vs-seed count.
create index if not exists listings_source_idx on listings (source);

-- 2. seed_inquiry — honest waitlist for interest in seed listings. We capture
--    the inquirer's contact + message instead of opening a fake chat thread.
create table if not exists seed_inquiry (
  id          uuid primary key default uuid_generate_v4(),
  listing_id  uuid references listings(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  name        text not null,
  email       text not null,
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists seed_inquiry_listing_idx on seed_inquiry (listing_id);
create index if not exists seed_inquiry_created_idx  on seed_inquiry (created_at desc);

alter table seed_inquiry enable row level security;

-- Signed-in users may add themselves to the waitlist. There is NO select
-- policy on purpose: only the service role (admin tooling) can read the list.
drop policy if exists "Authenticated users can join the seed waitlist" on seed_inquiry;
create policy "Authenticated users can join the seed waitlist"
  on seed_inquiry for insert
  to authenticated
  with check (auth.uid() = user_id);
