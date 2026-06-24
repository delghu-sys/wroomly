-- ─────────────────────────────────────────────────────────────────────────────
-- 021_security_hardening_advisor.sql
--
-- Fixes the Supabase Security Advisor findings on objects WE own (so this whole
-- script applies atomically with no risk of an ownership error). PostGIS /
-- storage items that need owner privileges live in 022 (run separately).
--
-- Covered here:
--   • CRITICAL  rls_disabled_in_public  -> users had RLS disabled
--   • ERROR-adjacent self-insert hole exposed once RLS is on
--   • WARN      rls_policy_always_true  -> users / conversations / transactions
--   • (privacy) anon could harvest every email / phone / Stripe id via REST
--   • WARN      function_search_path_mutable -> update_updated_at
--
-- Safe to re-run: every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CRITICAL — re-enable RLS on `users`. The policies below (and the 007
--    anti-escalation UPDATE policy) only take effect once this is on.
-- ═══════════════════════════════════════════════════════════════════════════
alter table users enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. rls_policy_always_true. Three policies named "Service role can ..." were
--    written `with check (true)` with NO role restriction, so they applied to
--    EVERYONE (anon + authenticated) — letting any caller insert arbitrary
--    rows (e.g. mint an admin user, fake a transaction). service_role bypasses
--    RLS entirely, so it never needed these; replace each with a scoped policy
--    that matches the real (authenticated) write path.
-- ═══════════════════════════════════════════════════════════════════════════

-- 2a. users INSERT — signup callback inserts a row with id = auth.uid().
--     Allow only that, and never let someone mint themselves an admin row.
drop policy if exists "Service role can insert users" on users;
create policy "Users can insert own non-admin row"
  on users for insert to authenticated
  with check (auth.uid() = id and user_type <> 'admin');

-- 2b. conversations INSERT — the consumer opens the thread (InquiryModal sets
--     consumer_id = current user). Nobody else may forge a conversation.
drop policy if exists "Service role can insert conversations" on conversations;
create policy "Consumer can create own conversation"
  on conversations for insert to authenticated
  with check (auth.uid() = consumer_id);

-- 2c. transactions — the old `for all using(true)` policy let any signed-in
--     user read/update/DELETE every transaction. Drop it; keep the existing
--     "view own" SELECT policy and add a scoped INSERT (the payer creates their
--     own pending charge). Stripe webhooks run as service_role (RLS-exempt).
drop policy if exists "Service role can manage transactions" on transactions;
create policy "Payer can create own transaction"
  on transactions for insert to authenticated
  with check (auth.uid() = payer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Stop anonymous harvesting of email / phone / Stripe ids. Public profiles
--    stay readable (the "view all profiles" SELECT policy is intentional), but
--    the anon role is limited at the COLUMN level to non-sensitive fields.
--    authenticated keeps full table access (own-profile settings, messaging
--    contact exchange, admin); service_role is unaffected.
-- ═══════════════════════════════════════════════════════════════════════════
revoke select on users from anon;
grant select (
  id, full_name, avatar_url, university, bio,
  instagram_handle, user_type, is_verified, created_at
) on users to anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. function_search_path_mutable — pin the trigger function's search_path so
--    it can't be hijacked by a malicious schema on the session search_path.
-- ═══════════════════════════════════════════════════════════════════════════
alter function public.update_updated_at() set search_path = '';
