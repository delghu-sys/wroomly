-- ─────────────────────────────────────────────────────────────────────────────
-- 017_private_import_bucket.sql
--
-- M1 (security audit): AI-import SOURCE files (screenshots, lease/sublease
-- PDFs, flyers) were being written to the PUBLIC `listing-images` bucket, so
-- anyone with the URL could read documents that may contain personal info —
-- exactly what the importer's own `mayContainPersonalInfo` flag warns about.
--
-- This creates a dedicated PRIVATE bucket for those source files. No RLS
-- policies are added on purpose: with the bucket private and no policies,
-- only the service-role client (which bypasses RLS) can read or write it.
-- The app reaches these files server-side and hands the browser/AI only
-- short-lived signed URLs. When a listing is published, the chosen photos
-- are copied out into the public `listing-images` bucket for display.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('listing-imports', 'listing-imports', false)
on conflict (id) do nothing;
