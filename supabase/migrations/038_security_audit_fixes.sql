-- ═══════════════════════════════════════════════════════════════════════════
-- 038_security_audit_fixes.sql  — APPLY ASAP
--
-- Phase-2 fixes from the 2026-07-21 security audit (security/audit branch).
-- Three findings, all empirically reproduced against prod with throwaway users:
--   C1 (CRITICAL) — inquiry INSERT policy recursion → renters can't inquire.
--   H1 (HIGH)     — a consumer can self-accept their inquiry and thereby read
--                   the supplier's email + phone without consent.
--   M1 (MEDIUM)   — image/amenity/swap rows of hidden listings are world-readable.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── C1: de-recurse the inquiry rate limit ───────────────────────────────────
-- Migration 023 put the per-hour cap in the inquiries INSERT policy as
-- `select count(*) from inquiries …` — a policy on `inquiries` that reads
-- `inquiries` is self-referential and Postgres aborts every insert with 42P17
-- (infinite recursion). Confirmed live: any inquiry insert → HTTP 500.
--
-- Fix: count via a SECURITY DEFINER function. It runs as its owner (the
-- migration superuser, which bypasses RLS), so the inner read of `inquiries`
-- does NOT re-enter the policy — no recursion. Same 15/hour cap, still
-- enforced at the DB layer for the browser-side insert.
create or replace function public.recent_inquiry_count(uid uuid)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int
  from public.inquiries
  where consumer_id = uid
    and created_at > now() - interval '1 hour'
$$;

revoke all on function public.recent_inquiry_count(uuid) from public, anon;
grant execute on function public.recent_inquiry_count(uuid) to authenticated;

drop policy if exists "Consumers can insert inquiries" on public.inquiries;
create policy "Consumers can insert inquiries"
  on public.inquiries for insert to authenticated
  with check (
    auth.uid() = consumer_id
    and public.recent_inquiry_count(auth.uid()) < 15
  );


-- ── H1: consumers may only WITHDRAW their inquiry, never accept/reject ───────
-- The 001 policy "Consumers can withdraw own inquiries" was
-- `for update using (auth.uid() = consumer_id)` with NO with-check, so a
-- consumer could PATCH status → 'accepted'. That matters because the messages
-- page reveals the counterpart's email + phone once status = 'accepted'
-- (src/app/(app)/messages/[id]/page.tsx) — so a consumer could harvest any
-- supplier's contact PII without the supplier ever accepting. Confirmed live.
--
-- Fix: the resulting row must be 'withdrawn'. Accept/reject stay supplier-only
-- (their separate policy is unchanged). No app flow updates inquiries as a
-- consumer today, so this only removes the abuse path.
drop policy if exists "Consumers can withdraw own inquiries" on public.inquiries;
create policy "Consumers can withdraw own inquiries"
  on public.inquiries for update
  using (auth.uid() = consumer_id)
  with check (auth.uid() = consumer_id and status = 'withdrawn');


-- ── M1: image/amenity/swap rows follow the parent listing's visibility ──────
-- These child tables had `select using (true)`, so anyone (even anon) could
-- read the storage paths, amenities, and swap preferences of draft/archived
-- listings whose parent row is correctly hidden. Confirmed live: anon read an
-- archived listing's listing_images row.
--
-- Fix: gate SELECT on the parent listing being visible. `exists (select 1 from
-- listings where id = listing_id)` is itself RLS-filtered by the listings
-- SELECT policy (active OR owner OR paid consumer), so this inherits exactly
-- the right visibility with no duplication. The owner "manage" (FOR ALL)
-- policies are unchanged, so owners still see their own drafts' children.
-- No recursion: these reference listings → transactions, never back to the
-- child table.
drop policy if exists "Anyone can view listing images" on public.listing_images;
create policy "View images for visible listings"
  on public.listing_images for select
  using (exists (select 1 from public.listings where id = listing_id));

drop policy if exists "Anyone can view amenities" on public.listing_amenities;
create policy "View amenities for visible listings"
  on public.listing_amenities for select
  using (exists (select 1 from public.listings where id = listing_id));

drop policy if exists "Anyone can view swap preferences" on public.swap_preferences;
create policy "View swap prefs for visible listings"
  on public.swap_preferences for select
  using (exists (select 1 from public.listings where id = listing_id));
