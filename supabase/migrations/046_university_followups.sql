-- ─────────────────────────────────────────────────────────────────────────────
-- 046_university_followups.sql
--
-- One follow-up per university, for the ones that have not replied. It goes
-- through the SAME approval discipline as the first email: drafted by the
-- app, approved by a person as an exact message (hash of To/From/Reply-to/
-- subject/body), then sent by a person. Never automatic, never more than one.
--
-- Kept as columns on university_prospects (not a second table): there is at
-- most one follow-up per row, and "who is due" is a single filter.
-- ─────────────────────────────────────────────────────────────────────────────

alter table university_prospects
  add column if not exists followup_subject        text,
  add column if not exists followup_body           text,
  add column if not exists followup_approved_at    timestamptz,
  add column if not exists followup_approval_hash  text,
  add column if not exists followup_sent_at        timestamptz,
  add column if not exists followup_message_id     text,
  add column if not exists followup_snapshot       jsonb;

create index if not exists university_prospects_followup_sent_idx
  on university_prospects (followup_sent_at);
