-- ═══════════════════════════════════════════════════════════════════════════
-- 035_listings_column_lock.sql
--
-- Stop public harvesting of partner contact emails + internal moderation data
-- from `listings`. Same column-privilege pattern as 021 (users/anon) and 029
-- (users/authenticated).
--
-- Found by the 2026-07-08 security audit: the `listings` SELECT policy is
-- public (listings are meant to be browsable), and both anon and authenticated
-- held FULL column access — so a scraper could pull:
--
--     GET /rest/v1/listings?select=inquiry_email  → 135 partner emails
--     (ZMichiganRental@gmail.com, cmb@annarborapartments.net, …)
--     GET /rest/v1/listings?select=auto_review_reason,auto_review_flags
--       → internal auto-moderation reasoning + flags
--
-- Neither column is read by the browser: `inquiry_email` is used only by
-- /api/inquiries/partner (service role), and the auto_review_* fields only by
-- the admin queue + auto-review API (both service role). So revoking them from
-- anon + authenticated has no client-facing effect — the public listing pages,
-- browse grid, and SEO pages select named non-sensitive columns and keep
-- working. service_role bypasses grants and is unaffected.
--
-- Row visibility is unchanged (the public SELECT policy stays as-is); this is
-- column-level enforcement, exactly as for users.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select on listings from anon, authenticated;

-- Re-grant every column EXCEPT: inquiry_email, auto_review_decision,
-- auto_review_reason, auto_review_flags. (auto_reviewed_at — a bare timestamp —
-- is kept; it reveals nothing on its own.)
grant select (
  id,
  supplier_id,
  type,
  title,
  description,
  address,
  neighborhood,
  lat,
  lng,
  city,
  state,
  price_per_month,
  deposit_amount,
  available_from,
  available_to,
  bedrooms,
  bathrooms,
  sq_ft,
  furnished,
  pets_allowed,
  utilities_included,
  status,
  created_at,
  updated_at,
  property_type,
  residence_name,
  auto_reviewed_at,
  source,
  source_name,
  source_url,
  closed_with,
  closed_at,
  video_path
) on listings to anon, authenticated;
