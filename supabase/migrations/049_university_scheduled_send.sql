-- Overnight scheduled sending for partner-university emails.
--
-- A scheduled message is handed to Resend with a future send time, so nothing
-- has to be running at 2:30 AM. The row is marked sent straight away (it counts
-- against the daily cap and cannot be scheduled twice); `scheduled_for` records
-- WHEN it will actually leave, so the dashboard can show "scheduled" until then
-- and offer to cancel. Cancelling returns the row to 'approved'.
--
-- Additive and nullable: the app works without it, and refuses to schedule
-- until it is applied.

alter table university_prospects
  add column if not exists scheduled_for timestamptz;

create index if not exists university_prospects_scheduled_for_idx
  on university_prospects (scheduled_for)
  where scheduled_for is not null;
