-- ─────────────────────────────────────────────────────────────────────────────
-- 023_inquiry_rate_limit.sql
--
-- Anti-abuse: cap how many inquiries a single consumer can create per hour, to
-- bound supplier email-bombing. Inquiries are inserted by the browser client
-- (InquiryModal), so the limit is enforced in the RLS INSERT policy itself —
-- DB-level and unbypassable, no new infrastructure.
--
-- The partial unique index from migration 007 already blocks duplicate
-- *pending* inquiries to the same listing, so this only needs to cap total
-- volume. 15/hour is well above any legitimate renter's pace.
--
-- Note: the count subquery is filtered by consumer_id = auth.uid() and the
-- inquiries SELECT policies are non-recursive, so there's no policy recursion.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Consumers can insert inquiries" on inquiries;

create policy "Consumers can insert inquiries"
  on inquiries for insert to authenticated
  with check (
    auth.uid() = consumer_id
    and (
      select count(*)
      from inquiries i
      where i.consumer_id = auth.uid()
        and i.created_at > now() - interval '1 hour'
    ) < 15
  );
