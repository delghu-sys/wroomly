-- ─────────────────────────────────────────────────────────────────────────────
-- 014_listing_import_requests.sql
--
-- "AI Listing Importer" backbone. A visitor pastes / uploads their existing
-- sublet post (+ optional building/floor-plan enrichment source); the AI
-- extracts a structured draft; we email them a magic link to claim, review,
-- and publish it.
--
-- ARCHITECTURE NOTE: the AI draft lives HERE in `extracted_data` (jsonb),
-- not in the `listings` table. `listings.supplier_id` is NOT NULL, and an
-- unclaimed import has no owner yet — so we only materialize a real
-- `listings` row at publish time, once the claimer is authenticated and
-- owns it. This keeps the listings table + its RLS untouched and makes it
-- impossible for an unconfirmed AI draft to appear in any public surface.
--
-- RLS: enabled with NO anon/authenticated policies → the table is reachable
-- only via the service-role client in server routes. The claim page looks a
-- request up by hashed token server-side; nothing is exposed to the browser.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists listing_import_requests (
  id                          uuid primary key default uuid_generate_v4(),
  email                       text not null,

  -- A. personal sublet source (source of truth)
  personal_source_url         text,
  personal_pasted_text        text,
  personal_image_paths        text[] not null default '{}',  -- listing-images bucket paths

  -- B. building / floor-plan enrichment source (factual enrichment only)
  building_source_url         text,
  building_pasted_text        text,
  building_image_paths        text[] not null default '{}',
  building_name               text,
  floor_plan_name             text,

  -- consent
  consent_confirmed              boolean not null default false,
  building_enrichment_consent    boolean not null default false,

  -- processing lifecycle
  status                      text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message               text,

  -- the normalized ExtractedListingDraft (+ source attribution, conflicts,
  -- confidence, safety flags) as returned by the AI module
  extracted_data              jsonb,

  -- claim flow
  claim_token_hash            text unique,          -- sha256 hex of the raw token
  claim_token_expires_at      timestamptz,
  claimed_by_user_id          uuid references users(id) on delete set null,
  claimed_at                  timestamptz,

  -- set once the user publishes — links to the real listing
  listing_id                  uuid references listings(id) on delete set null,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table listing_import_requests enable row level security;

-- No anon/authenticated policies on purpose: all access goes through the
-- service-role client in trusted server routes. RLS-on + zero-policies =
-- deny all for the public API roles.

create index if not exists listing_import_requests_token_idx
  on listing_import_requests (claim_token_hash);
create index if not exists listing_import_requests_email_idx
  on listing_import_requests (email);
create index if not exists listing_import_requests_status_idx
  on listing_import_requests (status);

-- Reuse the existing updated_at trigger function (defined in 001).
drop trigger if exists set_updated_at_on_listing_import_requests on listing_import_requests;
create trigger set_updated_at_on_listing_import_requests
  before update on listing_import_requests
  for each row execute function update_updated_at();
