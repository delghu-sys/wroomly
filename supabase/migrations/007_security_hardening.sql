-- ─────────────────────────────────────────────────────────────────────────────
-- 007_security_hardening.sql
--
-- Closes the open RLS holes the audit surfaced:
--   • `users` UPDATE policy let any signed-in user promote themselves to admin
--     by writing `user_type = 'admin'` (or flip is_verified / is_suspended /
--     stripe_account_id). Tightened via column-level enforcement.
--   • TOCTTOU windows in payment flow → UNIQUE constraints on transactions
--     and inquiries so the DB rejects duplicates instead of relying on
--     application-side checks.
--   • New `webhook_events` table for Stripe idempotency.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Replace the wide-open UPDATE policy with one that allows users to edit
--    only their *own* profile, and forbids touching trust-sensitive columns.
--    Anything that needs to change those columns (admin promotion, Stripe
--    onboarding, suspension) must go through a SECURITY DEFINER function
--    or the service role.
drop policy if exists "Users can update own profile" on users;

create policy "Users can update own profile"
  on users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Lock down trust-sensitive columns: the user can't change them at all
    -- via the anon/auth role. Server routes use the service-role client to
    -- mutate these.
    and user_type           is not distinct from (select user_type           from users where id = auth.uid())
    and is_verified         is not distinct from (select is_verified         from users where id = auth.uid())
    and is_suspended        is not distinct from (select is_suspended        from users where id = auth.uid())
    and stripe_account_id   is not distinct from (select stripe_account_id   from users where id = auth.uid())
    and stripe_customer_id  is not distinct from (select stripe_customer_id  from users where id = auth.uid())
    and email               is not distinct from (select email               from users where id = auth.uid())
  );

-- 2. UNIQUE on transactions.stripe_payment_intent_id — the webhook + the
--    /payment/success page both insert here; the unique constraint closes
--    the race that would otherwise create duplicate rows.
--
--    Existing column already nullable (we sometimes record a pending row
--    before Stripe returns an id). The constraint only applies when the
--    column is set, which is what we want.
create unique index if not exists transactions_stripe_payment_intent_id_uq
  on transactions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- 3. Partial UNIQUE on inquiries — one pending inquiry per (listing, consumer)
--    at a time. Accepted, rejected, and withdrawn are excluded so a consumer
--    can re-inquire after a rejection.
create unique index if not exists inquiries_listing_consumer_pending_uq
  on inquiries (listing_id, consumer_id)
  where status = 'pending';

-- 4. webhook_events — idempotency log for Stripe.
--    Webhooks insert (event_id, type) on first delivery; later redeliveries
--    hit the UNIQUE and the handler exits early.
create table if not exists webhook_events (
  id           text primary key,           -- Stripe event.id (`evt_…`)
  type         text not null,              -- Stripe event.type
  processed_at timestamptz not null default now()
);

alter table webhook_events enable row level security;

-- Only the service role writes here; no user-facing access at all.
create policy "Service role manages webhook_events"
  on webhook_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 5. Performance indexes implied by the audit's query-path review.
--    `create index if not exists` so re-running this migration is safe.
create index if not exists messages_conv_created_idx
  on messages (conversation_id, created_at);

create index if not exists messages_unread_idx
  on messages (conversation_id, is_read, sender_id)
  where is_read = false;

create index if not exists conversations_supplier_idx on conversations (supplier_id);
create index if not exists conversations_consumer_idx on conversations (consumer_id);
create index if not exists conversations_inquiry_idx  on conversations (inquiry_id);

create index if not exists inquiries_listing_status_idx
  on inquiries (listing_id, status);

create index if not exists inquiries_consumer_created_idx
  on inquiries (consumer_id, created_at desc);

create index if not exists transactions_payee_created_idx
  on transactions (payee_id, created_at desc);

create index if not exists transactions_payer_status_idx
  on transactions (payer_id, status);

create index if not exists listings_supplier_status_idx
  on listings (supplier_id, status);

create index if not exists listings_status_created_idx
  on listings (status, created_at desc);

create index if not exists favorites_user_idx on favorites (user_id);
create index if not exists reviews_reviewee_idx on reviews (reviewee_id);
