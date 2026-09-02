-- ─────────────────────────────────────────────────────────────────────────────
-- 040_backfill_umich_university.sql
--
-- `users.university` is only ever written from signup metadata, and Google
-- OAuth carries none — so every account that verified through UMich SSO landed
-- with university = null. The admin console showed a blank university for the
-- most strongly verified users (real Weblogin + Duo sessions) while the legacy
-- email-domain accounts, the weakest signal, showed "University of Michigan".
--
-- The callback now stamps the university at signup and backfills it on any
-- later SSO login, so this only closes the existing gap. Fills nulls only —
-- a value the user typed themselves is never overwritten.
-- ─────────────────────────────────────────────────────────────────────────────

update public.users
set university = 'University of Michigan'
where university is null
  and is_verified = true
  and verification_method in ('umich_sso', 'umich_email_legacy');
