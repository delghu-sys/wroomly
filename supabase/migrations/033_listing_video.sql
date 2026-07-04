-- ─────────────────────────────────────────────────────────────────────────────
-- 033_listing_video.sql  (feature/social-share — paste at merge time)
--
-- Optional short video walkthrough, one per listing, for the feed browse
-- mode (docs/social-share-audit.md item 2). Stored in the existing public
-- `listing-images` bucket under the owner's folder — the folder-ownership
-- INSERT policy from 016 already covers uploads, and public SELECT already
-- covers playback. Inert until the feature code ships: additive nullable
-- column, no RLS/grant changes needed (column rides the existing listings
-- policies; suppliers update their own rows through the same paths that set
-- images today).
-- ─────────────────────────────────────────────────────────────────────────────

alter table listings
  add column if not exists video_path text
  check (video_path is null or char_length(video_path) <= 300);

comment on column listings.video_path is
  'Optional walkthrough video in the listing-images bucket (owner folder). Muted autoplay in the feed; degrades to photos everywhere.';
