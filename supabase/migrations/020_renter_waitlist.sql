-- ─────────────────────────────────────────────────────────────────────────────
-- 020_renter_waitlist.sql
--
-- Renter waitlist for the supply-only soft launch. While SUPPLY_ONLY_MODE is on,
-- non-supplier visitors see /coming-soon and can leave their email here. Written
-- by /api/waitlist via the service-role client; RLS is enabled with no policies
-- so only the service role can read/write it.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists renter_waitlist (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null,
  source      text,            -- which page/path they joined from (optional)
  created_at  timestamptz not null default now()
);

-- One row per email (case-insensitive) so re-submits don't pile up.
create unique index if not exists renter_waitlist_email_uq on renter_waitlist (lower(email));
create index if not exists renter_waitlist_created_idx on renter_waitlist (created_at desc);

alter table renter_waitlist enable row level security;
-- No policies on purpose: service-role only (the /api/waitlist route).
