-- ─────────────────────────────────────────────────────────────────────────────
-- 024_value_check_constraints.sql
--
-- Server-side VALUE validation for the tables that the browser writes to
-- directly (listings, inquiries, messages, users, seed_inquiry). Client-side
-- Zod is UX only and bypassable; these CHECK constraints are the enforcement a
-- crafted request can't get around — they reject negative/absurd prices,
-- out-of-range room counts, and abusively long text at the database.
--
-- Bounds are deliberately generous (far above any legitimate value — current
-- max rent is ~$2.9k/mo, longest title 69 chars) so nothing real is rejected.
-- NULLs pass CHECK by definition, so optional/swap fields are unaffected.
--
-- Idempotent: each constraint is dropped first, so this is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── listings ────────────────────────────────────────────────────────────────
alter table listings drop constraint if exists listings_price_range_chk;
alter table listings add constraint listings_price_range_chk
  check (price_per_month >= 0 and price_per_month <= 100000000);  -- cents; ≤ $1M/mo

alter table listings drop constraint if exists listings_deposit_range_chk;
alter table listings add constraint listings_deposit_range_chk
  check (deposit_amount >= 0 and deposit_amount <= 100000000);

alter table listings drop constraint if exists listings_bedrooms_range_chk;
alter table listings add constraint listings_bedrooms_range_chk
  check (bedrooms >= 0 and bedrooms <= 50);

alter table listings drop constraint if exists listings_bathrooms_range_chk;
alter table listings add constraint listings_bathrooms_range_chk
  check (bathrooms >= 0 and bathrooms <= 50);

alter table listings drop constraint if exists listings_title_len_chk;
alter table listings add constraint listings_title_len_chk
  check (char_length(title) <= 200);

alter table listings drop constraint if exists listings_description_len_chk;
alter table listings add constraint listings_description_len_chk
  check (char_length(description) <= 10000);

-- ── inquiries ───────────────────────────────────────────────────────────────
alter table inquiries drop constraint if exists inquiries_message_len_chk;
alter table inquiries add constraint inquiries_message_len_chk
  check (char_length(message) <= 5000);

-- ── messages ────────────────────────────────────────────────────────────────
-- 10k is well above any real chat message and the ::deal_accepted:: payloads.
alter table messages drop constraint if exists messages_content_len_chk;
alter table messages add constraint messages_content_len_chk
  check (char_length(content) <= 10000);

-- ── users (profile fields editable from the browser) ──────────────────────────
alter table users drop constraint if exists users_bio_len_chk;
alter table users add constraint users_bio_len_chk
  check (char_length(bio) <= 2000);

alter table users drop constraint if exists users_full_name_len_chk;
alter table users add constraint users_full_name_len_chk
  check (char_length(full_name) <= 120);

-- ── seed_inquiry (waitlist captured from the browser) ─────────────────────────
alter table seed_inquiry drop constraint if exists seed_inquiry_message_len_chk;
alter table seed_inquiry add constraint seed_inquiry_message_len_chk
  check (char_length(message) <= 5000);

alter table seed_inquiry drop constraint if exists seed_inquiry_name_len_chk;
alter table seed_inquiry add constraint seed_inquiry_name_len_chk
  check (char_length(name) <= 200);

alter table seed_inquiry drop constraint if exists seed_inquiry_email_len_chk;
alter table seed_inquiry add constraint seed_inquiry_email_len_chk
  check (char_length(email) <= 320);
