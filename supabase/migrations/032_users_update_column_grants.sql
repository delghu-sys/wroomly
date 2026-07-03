-- ─────────────────────────────────────────────────────────────────────────────
-- 032_users_update_column_grants.sql  — APPLY ASAP (fixes live breakage)
--
-- Migration 029 revoked SELECT on users.email / phone / stripe_customer_id /
-- stripe_account_id from `authenticated`. But the "Users can update own
-- profile" policy (008) enforces trust-column immutability through WITH CHECK
-- subqueries that SELECT those very columns as the calling role — so since
-- 029, EVERY profile update by any signed-in user fails with
-- "permission denied for table users". Confirmed live 2026-07-04 with a
-- throwaway user (bio update → 403); caught by tests/e2e/security.spec.ts.
--
-- Fix, following 029's own pattern: enforce immutability with column-level
-- UPDATE grants instead of policy subqueries. `authenticated` may update only
-- the true profile fields; every trust/identity/money column becomes
-- non-updatable at the grant layer (stronger than the policy check it
-- replaces), and the policy shrinks to plain row ownership.
--
-- Safe to apply immediately — requires no code deploy (the app's profile
-- form already updates only these columns).
-- ─────────────────────────────────────────────────────────────────────────────

revoke update on users from authenticated;
grant update (full_name, university, bio, phone, instagram_handle, avatar_url)
  on users to authenticated;

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile"
  on users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
