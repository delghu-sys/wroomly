-- ═══════════════════════════════════════════════════════════════════════════
-- 036_umich_verification.sql
--
-- Make "UMich verified" real. Until now `is_verified` was set to true for
-- EVERY account at signup (callback/route.ts) with no domain check, so the
-- "U of M verified" seal on profiles showed for everyone — including non-UMich
-- accounts. This migration gives the flag meaning and gates listing on it.
--
-- New model (pure badge, no gate): anyone can sign up (Google / Apple / email),
-- browse, inquire, AND list — verification gates nothing. Verification = signing
-- in with a Google @umich.edu account (Google Workspace ⇒ the login goes through
-- UMich Weblogin + Duo), which the callback confirms server-side and records as
-- verification_method='umich_sso'. Its only effect is the blue check next to the
-- user's name, so renters can see which listings come from a verified UMich
-- student. Listing itself stays open to everyone.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. How the account earned its verification. 'umich_sso' (Google @umich.edu),
--    'umich_email_legacy' (pre-036 @umich.edu email signups), 'admin' (manual),
--    or null (unverified). Drives nothing on its own — is_verified is the gate —
--    but lets us tell SSO-verified from legacy and audit later.
alter table public.users add column if not exists verification_method text;

-- 2. Backfill. Repurpose is_verified to mean "verified UMich". Existing
--    @umich.edu accounts keep the badge as legacy-verified (they're almost
--    certainly real UMich students); everyone else loses the badge it never
--    should have had. Pre-launch, this touches a handful of rows.
update public.users
set
  is_verified = (lower(email) like '%@umich.edu'),
  verification_method = case
    when lower(email) like '%@umich.edu' then 'umich_email_legacy'
    else null
  end;

-- 3. verification_method is public — it rides alongside is_verified to render
--    the blue check on cards/profiles. Grant SELECT on just the new column to
--    both roles (additive to the anon grant in 021 and the authenticated grant
--    in 029; those columns are otherwise unchanged).
grant select (verification_method) on public.users to anon, authenticated;

-- NOTE: listing creation is deliberately NOT gated on verification. Anyone can
-- post; the blue check is a visible signal, not a permission. The existing
-- "Suppliers can insert own listings" policy (auth.uid() = supplier_id) stays
-- exactly as-is.
