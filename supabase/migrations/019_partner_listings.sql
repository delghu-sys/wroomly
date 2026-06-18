-- ─────────────────────────────────────────────────────────────────────────────
-- 019_partner_listings.sql
--
-- Adds support for "partner" listings: real, claimable inventory from a managed
-- partner (e.g. A2 Management), distinct from throwaway 'seed' supply.
--   • New 'partner' value on the listing_source enum. The seed teardown only
--     targets source='seed', so partner rows are never swept up.
--   • inquiry_email on listings: where partner inquiries are forwarded. The
--     inquiry API reads this server-side (never trusts a client-supplied addr).
--
-- Partner rows are inserted by scripts/importPartners.mjs via the service-role
-- client, owned by a partner system user it provisions.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend the source enum. ADD VALUE IF NOT EXISTS is safe to re-run and,
--    on Postgres 12+, may run in a transaction as long as the new value isn't
--    used in the same transaction (it isn't — rows are inserted later).
alter type listing_source add value if not exists 'partner';

-- 2. Forwarding address for partner inquiries.
alter table listings add column if not exists inquiry_email text;

-- 3. Idempotency key for the partner importer: one row per address.
create index if not exists listings_partner_dedupe_idx
  on listings (address)
  where source = 'partner';
