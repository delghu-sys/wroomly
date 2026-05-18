-- ─────────────────────────────────────────────────────────────────────────────
-- 008_stripe_connect_status.sql
--
-- Adds DB-side mirroring of a supplier's Stripe Connect readiness so we can
-- gate features (inquiry accept, listing publish) without an RTT to Stripe
-- on every request. The webhook handler updates these on `account.updated`.
--
-- Also re-issues the locked-down users UPDATE policy from 007 to include the
-- new columns — without re-issuing, a `with check` that doesn't mention a
-- column lets the user write whatever they want to it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table users
  add column if not exists stripe_charges_enabled    boolean not null default false,
  add column if not exists stripe_payouts_enabled    boolean not null default false,
  add column if not exists stripe_details_submitted  boolean not null default false;

-- Re-issue the policy so the new trust columns are immutable to the user role.
drop policy if exists "Users can update own profile" on users;

create policy "Users can update own profile"
  on users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and user_type                  is not distinct from (select user_type                  from users where id = auth.uid())
    and is_verified                is not distinct from (select is_verified                from users where id = auth.uid())
    and is_suspended               is not distinct from (select is_suspended               from users where id = auth.uid())
    and stripe_account_id          is not distinct from (select stripe_account_id          from users where id = auth.uid())
    and stripe_customer_id         is not distinct from (select stripe_customer_id         from users where id = auth.uid())
    and stripe_charges_enabled     is not distinct from (select stripe_charges_enabled     from users where id = auth.uid())
    and stripe_payouts_enabled     is not distinct from (select stripe_payouts_enabled     from users where id = auth.uid())
    and stripe_details_submitted   is not distinct from (select stripe_details_submitted   from users where id = auth.uid())
    and email                      is not distinct from (select email                      from users where id = auth.uid())
  );
