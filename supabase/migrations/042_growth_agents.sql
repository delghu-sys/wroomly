-- ─────────────────────────────────────────────────────────────────────────────
-- 042_growth_agents.sql
--
-- Tables for the growth agents: discovery (find sublets posted on public boards
-- that invite contact), drafting (pre-fill a claimable listing), and outreach
-- (tell the person it exists, once).
--
-- Two hard rules are encoded here rather than left to application code:
--
--   1. A discovered lead is NEVER published. It becomes a pending
--      listing_import_requests row that only the owner can turn into a live
--      listing by claiming it. We store a LINK plus extracted facts, not a copy
--      of someone's photos. `sourced_leads` therefore has no image columns.
--
--   2. Nobody is contacted twice, ever, and anyone can opt out permanently.
--      `outreach_suppressions` is keyed by email and survives deletion of the
--      lead that caused it, so an opt-out cannot be undone by re-discovery.
--
-- Both tables hold personal data about people who are NOT users, so both are
-- RLS-on with ZERO policies: service-role only, same pattern as
-- listing_import_requests (014).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists sourced_leads (
  id                  uuid primary key default uuid_generate_v4(),

  -- Provenance. (source, source_external_id) is the idempotency key: re-running
  -- discovery over the same board must never create a second lead or a second
  -- outreach. `source_url` is what we show a human and what we link to instead
  -- of copying the post.
  source              text not null,
  source_external_id  text not null,
  source_url          text,

  -- Extracted facts only — never the original photos. Free text the adapter
  -- pulled (title/price/dates/neighborhood) lives in `extracted`.
  title               text,
  contact_email       text,
  extracted           jsonb not null default '{}'::jsonb,

  -- Lifecycle.
  --   new       — discovered, nothing done yet
  --   drafted   — a pending listing_import_requests row exists (import_request_id)
  --   contacted — outreach sent (see outreach_sent_at)
  --   skipped   — deliberately not acted on; skip_reason says why
  status              text not null default 'new'
    check (status in ('new', 'drafted', 'contacted', 'skipped')),
  skip_reason         text,

  import_request_id   uuid references listing_import_requests(id) on delete set null,

  outreach_sent_at    timestamptz,
  discovered_at       timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table sourced_leads enable row level security;
-- No policies on purpose: deny-all for anon/authenticated. Third-party personal
-- data must never be readable through the public API, the way users.email is not.

create unique index if not exists sourced_leads_dedupe_idx
  on sourced_leads (source, source_external_id);
create index if not exists sourced_leads_status_idx on sourced_leads (status);
create index if not exists sourced_leads_email_idx on sourced_leads (lower(contact_email));
-- Powers the rolling daily send cap without a separate log table.
create index if not exists sourced_leads_outreach_sent_idx on sourced_leads (outreach_sent_at);

drop trigger if exists set_updated_at_on_sourced_leads on sourced_leads;
create trigger set_updated_at_on_sourced_leads
  before update on sourced_leads
  for each row execute function update_updated_at();


-- Permanent opt-out list. Separate from sourced_leads so that deleting or
-- re-discovering a lead can never resurrect a suppressed address.
create table if not exists outreach_suppressions (
  email       text primary key,
  reason      text not null default 'unsubscribed'
    check (reason in ('unsubscribed', 'bounced', 'complaint', 'manual')),
  created_at  timestamptz not null default now()
);

alter table outreach_suppressions enable row level security;
-- Also service-role only. The unsubscribe endpoint writes through the server.

comment on table sourced_leads is
  'Sublets discovered on public boards. Never published; only ever turned into a pending, claimable draft.';
comment on table outreach_suppressions is
  'Permanent email opt-out list. Checked before every send; survives lead deletion.';
