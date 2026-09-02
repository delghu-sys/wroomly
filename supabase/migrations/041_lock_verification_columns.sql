-- ─────────────────────────────────────────────────────────────────────────────
-- 041_lock_verification_columns.sql  — APPLY ASAP (closes a self-verify hole)
--
-- The "verified UMich student" badge is `users.is_verified` (+ verification_method).
-- Migrations 029/032 locked these columns against SELECT and UPDATE by the
-- `authenticated` role, but INSERT was never constrained. So a signed-in user
-- with no row yet could self-INSERT their first row with is_verified=true —
-- via the public REST API, no UI, no Google, no Duo:
--
--   POST /rest/v1/users { id: <own uid>, is_verified: true,
--                         verification_method: 'umich_sso' }   → accepted
--
-- Confirmed live (throwaway gmail account, deleted). This closes it two ways,
-- matching 032's belt-and-suspenders pattern:
--   1. column-level: `authenticated` may INSERT only non-trust columns, so it
--      cannot name is_verified / verification_method at all (they take their
--      NOT NULL DEFAULT false / null);
--   2. policy WITH CHECK: the inserted row must have is_verified=false and
--      verification_method=null, so even a future grant change can't reopen it.
--
-- All legitimate verification is written by the server (the /callback route and
-- the layout self-heal) using the service role, which bypasses RLS and grants.
-- Nothing an end-user session does should ever set these columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Column-level INSERT lock. Revoke blanket INSERT, re-grant only the columns
--    a user legitimately supplies for their own row. Omitting a column here
--    makes it un-insertable by `authenticated`; it falls to its default.
revoke insert on users from authenticated;
grant insert (
  id,
  email,
  full_name,
  university,
  user_type,
  bio,
  phone,
  instagram_handle,
  avatar_url,
  signup_source
) on users to authenticated;

-- 2. Policy-level guard. Keep the own-non-admin-row rule and additionally pin
--    the trust columns to their unverified state on any self-insert.
drop policy if exists "Users can insert own non-admin row" on users;
create policy "Users can insert own non-admin row"
  on users for insert to authenticated
  with check (
    auth.uid() = id
    and user_type <> 'admin'
    and is_verified = false
    and verification_method is null
  );

-- Note: the SELECT grants from 021/029/036 (which expose is_verified +
-- verification_method for rendering the badge) are intentionally unchanged.
-- Reading the flag is fine; only writing it from a user session is the risk.
