-- ═══════════════════════════════════════════════════════════════════════════
-- 036_umich_verification.sql
--
-- Make "UMich verified" real. Until now `is_verified` was set to true for
-- EVERY account at signup (callback/route.ts) with no domain check, so the
-- "U of M verified" seal on profiles showed for everyone — including non-UMich
-- accounts. This migration gives the flag meaning and gates listing on it.
--
-- New model (badge, not gate): anyone can sign up (Google / Apple / email) and
-- browse or inquire. Verification = signing in with a Google @umich.edu account
-- (Google Workspace ⇒ the login goes through UMich Weblogin + Duo), which the
-- callback confirms server-side and records as verification_method='umich_sso'.
-- Only verified users get the blue check and only they can publish a listing.
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

-- 4. Gate listing creation on verification, at the DB layer (the create-listing
--    wizard inserts under the user's own session, so RLS — not app code — is the
--    real enforcement). The subquery reads id + is_verified, both already
--    granted to `authenticated` by 029, so it evaluates under the caller's role.
--    Service-role paths (import publish, partner, seed inventory) bypass RLS and
--    enforce verification in code where relevant.
drop policy if exists "Suppliers can insert own listings" on public.listings;
create policy "Verified suppliers can insert own listings"
  on public.listings for insert
  with check (
    auth.uid() = supplier_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_verified = true
    )
  );
