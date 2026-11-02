-- ─────────────────────────────────────────────────────────────────────────────
-- 045_partner_outreach_cap.sql
--
-- The partner-outreach daily cap was limited to 1–50 (044). The operator
-- wants a default of 100, so the ceiling moves to 200 and the column default
-- to 100. The cap is still a safety rail, just a wider one: it is enforced on
-- every send (checkSend), over a rolling 24 hours.
--
-- The old check is dropped by looking it up rather than by guessing its name,
-- so this works however Postgres happened to name it.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'partner_outreach_settings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%daily_cap%'
  loop
    execute format('alter table partner_outreach_settings drop constraint %I', c);
  end loop;
end $$;

alter table partner_outreach_settings
  add constraint partner_outreach_settings_daily_cap_check
  check (daily_cap between 1 and 200);

alter table partner_outreach_settings alter column daily_cap set default 100;
