-- ─────────────────────────────────────────────────────────────────────────────
-- 012_paid_consumer_listing_visibility.sql
--
-- The original listings SELECT policy from 001 only let the public read
-- `status = 'active'` listings, plus owners reading their own at any
-- status. That meant a consumer who paid for a place lost access to it
-- the moment the supplier (or our webhook) flipped status → 'rented' or
-- 'archived'. They'd click their booking in /dashboard, hit
-- /listings/[id], and the auth-bound client's SELECT returned zero rows
-- → 404 ("this room doesn't exist") even though it was THEIR booking.
--
-- Fix: extend the policy so a consumer who has a *succeeded* transaction
-- against a listing can read that listing regardless of status. Browse
-- still only shows `active` (the application-layer filter handles that).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Anyone can view active listings" on listings;

create policy "Anyone can view active listings"
  on listings for select using (
    status = 'active'
    or supplier_id = auth.uid()
    or exists (
      select 1 from transactions
      where transactions.listing_id = listings.id
        and transactions.payer_id = auth.uid()
        and transactions.status = 'succeeded'
    )
  );
