-- ─────────────────────────────────────────────────────────────────────────────
-- 009_partial_refunds.sql
--
-- Adds a `refunded_cents` column on transactions so we can reconcile partial
-- refunds. The webhook updates this on every `charge.refunded` /
-- `charge.refund.updated` event; full refunds additionally flip
-- `status = 'refunded'`.
-- ─────────────────────────────────────────────────────────────────────────────

alter table transactions
  add column if not exists refunded_cents integer not null default 0;

-- Defensive: never let refunded_cents exceed the original charge.
alter table transactions
  drop constraint if exists transactions_refunded_cents_le_amount_chk;
alter table transactions
  add constraint transactions_refunded_cents_le_amount_chk
  check (refunded_cents >= 0 and refunded_cents <= amount_cents);
