-- ============================================================
-- MichiganNest — Auto-review fields
-- ============================================================
-- Records the AI agent's decision and reasoning so a human admin
-- can still audit decisions in /admin/listings.
-- ============================================================

alter table listings
  add column if not exists auto_review_decision text
    check (auto_review_decision in ('approve', 'reject', 'manual')),
  add column if not exists auto_review_reason text,
  add column if not exists auto_review_flags text[],
  add column if not exists auto_reviewed_at timestamptz;

create index if not exists listings_auto_review_decision_idx
  on listings(auto_review_decision);
