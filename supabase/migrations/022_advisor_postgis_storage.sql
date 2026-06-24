-- ─────────────────────────────────────────────────────────────────────────────
-- 022_advisor_postgis_storage.sql
--
-- Lower-priority Security Advisor items that touch objects owned by extensions
-- (PostGIS) or Supabase Storage. Run each statement on its own — if one fails
-- with "must be owner of ...", that's a known Supabase/PostGIS limitation and
-- is safe to skip (the data involved is non-sensitive); it does NOT affect the
-- critical fixes in 021.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. rls_disabled_in_public on spatial_ref_sys — PostGIS's read-only table of
--    EPSG coordinate-system definitions (public reference data, nothing of
--    yours). Enabling RLS stops it being listed/written via the REST API.
--    PostGIS reads it internally (not through PostgREST), so geo queries are
--    unaffected. May require owner privileges.
alter table public.spatial_ref_sys enable row level security;

-- 2. anon/authenticated can execute the SECURITY DEFINER PostGIS function
--    st_estimatedextent via /rpc. Your app never calls it; revoke public exec.
revoke execute on function public.st_estimatedextent(text, text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from anon, authenticated;

-- 3. public_bucket_allows_listing on `listing-images`. The broad SELECT policy
--    lets clients ENUMERATE every file in the bucket. Listing images are served
--    by public object URL (your app builds URLs from stored paths and never
--    calls .list()), so removing it keeps images loading while blocking
--    directory enumeration.
drop policy if exists "Public can view listing images" on storage.objects;
