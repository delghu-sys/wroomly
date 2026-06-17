-- ─────────────────────────────────────────────────────────────────────────────
-- 015_import_admin_review.sql
--
-- Inserts an admin-approval step into the AI import flow. After the AI drafts
-- a listing the request now lands in 'awaiting_admin_review' (no claim token,
-- no user email yet). An admin reviews the submission + AI draft, optionally
-- edits it, then approves — which mints the claim token, flips status to
-- 'completed', and sends the user their claim email.
--
-- New lifecycle:
--   pending → processing → awaiting_admin_review → completed
--                                     ↘ (reject) → failed
-- ─────────────────────────────────────────────────────────────────────────────

alter table listing_import_requests
  drop constraint if exists listing_import_requests_status_check;

alter table listing_import_requests
  add constraint listing_import_requests_status_check
  check (status in ('pending', 'processing', 'awaiting_admin_review', 'completed', 'failed'));

-- Who approved + when (audit trail for the admin gate).
alter table listing_import_requests
  add column if not exists reviewed_by_user_id uuid references users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;
