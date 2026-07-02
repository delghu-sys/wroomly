-- ═══════════════════════════════════════════════════════════════════════════
-- 029_users_authenticated_column_lockdown.sql
--
-- Close the authenticated-user contact-scraping hole on `users`.
--
-- Migration 021 column-locked the ANON role (public key) so a logged-OUT
-- visitor can't scrape email/phone/stripe ids. But the users SELECT policy is
-- `using(true)` and the `authenticated` role still held full column access, so
-- ANY signed-in user could read every other user's email, phone, and Stripe
-- ids straight off PostgREST:
--
--     GET /rest/v1/users?select=email,phone,stripe_customer_id,stripe_account_id
--
-- No app code required — this bypasses the UI entirely.
--
-- Fix: revoke `authenticated`'s access to the four sensitive columns and grant
-- back only the non-sensitive ones (same shape as the anon grant in 021). The
-- `using(true)` SELECT policy is intentionally left as-is: row visibility is
-- unchanged (members can still see each other's public profile fields for
-- messaging, listings, reviews) — column privileges are the enforcement layer,
-- exactly as for anon.
--
-- Legitimate readers of the revoked columns were migrated to run under the
-- service role (server contexts) or the auth session (own email in the
-- browser); the messages contact-reveal now reads the counterpart's contact
-- via the service role only after a membership + acceptance check. See the
-- accompanying code changes.
--
-- service_role is unaffected (it bypasses RLS and column grants).
-- The anon grant from 021 is deliberately left untouched.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select on users from authenticated;

grant select (
  id,
  full_name,
  university,
  user_type,
  avatar_url,
  bio,
  instagram_handle,
  is_verified,
  is_suspended,
  created_at,
  stripe_charges_enabled,
  stripe_payouts_enabled,
  stripe_details_submitted
) on users to authenticated;

-- NOT granted to authenticated (readable only via the service role / session):
--   email, phone, stripe_customer_id, stripe_account_id
