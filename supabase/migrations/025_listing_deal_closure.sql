-- ─────────────────────────────────────────────────────────────────────────────
-- 025_listing_deal_closure.sql
--
-- Gives the matching-only launch an explicit "deal closed" path. Until now
-- the ONLY thing that took a listing off the market automatically was the
-- Stripe webhook flipping status → 'rented' on a succeeded payment — and
-- payments are disabled. So two people would match, arrange everything
-- off-platform, and the listing would sit 'active' forever collecting
-- inquiries because nobody flipped it by hand.
--
-- A supplier can now mark a listing as taken straight from the chat
-- (POST /api/inquiries/[id]/close-deal). We record WHICH renter the deal
-- closed with so that renter keeps read access to the now non-active
-- listing — the same guarantee 012 gave paid consumers, but for the
-- no-payment matching flow. Without this they'd 404 on the place they
-- just agreed to rent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table listings
  add column if not exists closed_with uuid references users(id) on delete set null,
  add column if not exists closed_at   timestamptz;

create index if not exists listings_closed_with_idx on listings(closed_with);

-- Extend listing read access: the matched renter can always read the
-- listing they closed a deal on, regardless of status. Mirrors the
-- succeeded-transaction clause added in 012.
drop policy if exists "Anyone can view active listings" on listings;

create policy "Anyone can view active listings"
  on listings for select using (
    status = 'active'
    or supplier_id = auth.uid()
    or closed_with = auth.uid()
    or exists (
      select 1 from transactions
      where transactions.listing_id = listings.id
        and transactions.payer_id = auth.uid()
        and transactions.status = 'succeeded'
    )
  );
