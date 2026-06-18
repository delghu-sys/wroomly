-- ─────────────────────────────────────────────────────────────────────────────
-- 016_rls_authorization_hardening.sql
--
-- Closes the authorization gaps the security audit surfaced. All of these
-- are *state-transition* / mass-assignment holes: the previous policies
-- checked WHO owns a row but not WHAT values the row is allowed to take,
-- so a client speaking directly to PostgREST (anon JWT is readable in the
-- browser) could move rows into privileged states.
--
--   H1  listings: a client could INSERT/UPDATE status = 'active' directly,
--       bypassing the auto-review + admin-approval moderation pipeline.
--   L2  listings/inquiries UPDATE lacked WITH CHECK, so the post-update row
--       was never validated (e.g. reassigning supplier_id / listing_id).
--   L3  storage: any authenticated user could upload to ANY path in the
--       listing-images bucket (no folder-ownership check on INSERT).
--
-- Activation ('active') is reserved for the service-role client used by the
-- auto-review route and admin actions — those bypass RLS entirely and are
-- unaffected by the tighter policies below.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── H1: listings INSERT — new rows may only enter the review queue ──────────
drop policy if exists "Suppliers can insert own listings" on listings;
create policy "Suppliers can insert own listings"
  on listings for insert
  with check (
    auth.uid() = supplier_id
    -- A browser may only create a draft or submit for review. Going live
    -- requires passing service-role moderation, never a direct client write.
    and status in ('draft', 'pending_review')
  );

-- ── H1 + L2: listings UPDATE — owner-locked, and can't self-activate ─────────
drop policy if exists "Suppliers can update own listings" on listings;
create policy "Suppliers can update own listings"
  on listings for update
  using (auth.uid() = supplier_id)
  with check (
    auth.uid() = supplier_id
    -- The supplier may freely move a listing to any non-active lifecycle
    -- state (rented / swapped / archived / back to pending_review for a
    -- re-list), and may keep editing a listing that is ALREADY active.
    -- They may NOT flip a draft/pending/archived listing to 'active'
    -- themselves — that transition belongs to service-role review.
    and (
      status <> 'active'
      or (select l.status from listings l where l.id = listings.id) = 'active'
    )
  );

-- ── L2: inquiries UPDATE — validate the post-update row too ──────────────────
drop policy if exists "Suppliers can update inquiry status on own listings" on inquiries;
create policy "Suppliers can update inquiry status on own listings"
  on inquiries for update
  using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  )
  with check (
    -- Prevent moving an inquiry onto a listing the caller doesn't own.
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

-- ── L3: storage uploads must stay within the caller's own namespace ─────────
-- Client uploads to the listing-images bucket use three path conventions:
--   <uid>/<listingId>/<n>.<ext>      (listing photos — ListingWizard)
--   profile-photos/<uid>/<file>      (profile gallery — ProfileForm)
--   avatars/<uid>.<ext>              (avatar — ProfileForm)
-- AI-import source files are written under imports/<requestId>/… by the
-- service-role client, which bypasses RLS and is therefore unaffected.
drop policy if exists "Authenticated users can upload listing images" on storage.objects;
create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text                      -- <uid>/…
      or (storage.foldername(name))[2] = auth.uid()::text                   -- profile-photos/<uid>/…
      or name like ('avatars/' || auth.uid()::text || '.%')                 -- avatars/<uid>.<ext>
    )
  );
