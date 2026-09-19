-- ─────────────────────────────────────────────────────────────────────────────
-- 043_outreach_template.sql
--
-- The outreach agent's subject line and message were hardcoded in
-- runner.ts — no way to see or change what a real send would say without
-- editing source. This makes them editable from /admin/agents.
--
-- Single-row table (id is always 'default') rather than a generic key/value
-- settings table: there is exactly one thing to configure today, and a fixed
-- id keeps `upsert` trivial and the row impossible to duplicate by accident.
--
-- Same pattern as sourced_leads / outreach_suppressions: RLS-on, ZERO
-- policies. Nobody but the service role reads or writes this — not because
-- the template is sensitive, but because there is no legitimate reason for
-- the public API to touch it at all.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists outreach_template (
  id          text primary key default 'default'
    check (id = 'default'),
  subject     text not null,
  -- The admin-editable portion only. The unsubscribe line and the CAN-SPAM
  -- postal address are NOT stored here — they are appended in code
  -- (src/lib/agents/outreach-template.ts), so an edit here can never remove
  -- the legally required parts of the email.
  body        text not null,
  updated_at  timestamptz not null default now()
);

alter table outreach_template enable row level security;

drop trigger if exists set_updated_at_on_outreach_template on outreach_template;
create trigger set_updated_at_on_outreach_template
  before update on outreach_template
  for each row execute function update_updated_at();

comment on table outreach_template is
  'The one editable outreach email (subject + body). Unsub link and postal address are appended in code, never stored here.';
