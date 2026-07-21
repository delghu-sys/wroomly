-- ═══════════════════════════════════════════════════════════════════════════
-- 037_fix_listings_update_recursion.sql  — APPLY ASAP (fixes live breakage)
--
-- Fixes: "infinite recursion detected in policy for relation listings" on any
-- listing status change (e.g. archiving), reported 2026-07-21.
--
-- Root cause: migration 016's listings UPDATE policy tried to allow editing an
-- already-active listing while blocking a supplier from self-activating a
-- draft/pending one, by reading the CURRENT status inside the WITH CHECK:
--   (select l.status from listings l where l.id = listings.id) = 'active'
-- A policy on `listings` that subqueries `listings` is self-referential →
-- Postgres raises 42P17 (infinite recursion). It surfaces on status changes
-- because that's when the WITH CHECK's status branch is exercised.
--
-- Fix: RLS WITH CHECK only sees the NEW row, so the OLD-vs-NEW rule can't live
-- there without recursion. Move it into a BEFORE UPDATE trigger, which sees
-- OLD and NEW natively, and simplify the policy to plain ownership.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Suppliers can update own listings" on public.listings;
create policy "Suppliers can update own listings"
  on public.listings for update
  using (auth.uid() = supplier_id)
  with check (auth.uid() = supplier_id);

-- Preserve 016's intent (a client can't flip a listing INTO 'active' — that
-- transition belongs to service-role review) without the recursive subquery.
-- current_user is the PostgREST-set role: 'authenticated'/'anon' for client
-- calls, 'service_role' (or postgres/supabase_admin) for privileged ones — so
-- the auto-review service client can still activate, and postgres migrations
-- are unaffected. search_path is pinned; the body references no tables.
create or replace function public.enforce_listing_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active'
     and old.status is distinct from 'active'
     and current_user in ('authenticated', 'anon')
  then
    raise exception 'Listings can only be activated through review, not a direct update';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_listing_activation on public.listings;
create trigger trg_enforce_listing_activation
  before update on public.listings
  for each row execute function public.enforce_listing_activation();
