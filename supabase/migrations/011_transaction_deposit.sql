-- ─────────────────────────────────────────────────────────────────────────────
-- 011_transaction_deposit.sql
--
-- Tracks the deposit portion of a booking payment separately from rent.
-- The transaction's `amount_cents` is still the total paid by the consumer
-- (rent + deposit + platform_fee). We add `deposit_cents` so the UI can
-- show the breakdown and a future "return deposit" flow has somewhere to
-- look up the original deposit value without reading metadata.
--
-- The invariants:
--   amount_cents       = rent + deposit + platform_fee
--   platform_fee_cents = Wroomly's slice (5% of rent only — deposit is
--                        held money, not consumed)
--   deposit_cents      = what the supplier holds for the consumer
--   amount - fee - dep = first month's rent
-- ─────────────────────────────────────────────────────────────────────────────

alter table transactions
  add column if not exists deposit_cents integer not null default 0;

-- Defensive: deposit can't be negative, and the sum of components can't
-- exceed the total. (Refunds are tracked via refunded_cents from 009.)
alter table transactions
  drop constraint if exists transactions_deposit_cents_nonneg_chk;
alter table transactions
  add constraint transactions_deposit_cents_nonneg_chk
  check (deposit_cents >= 0);
