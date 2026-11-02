-- ─────────────────────────────────────────────────────────────────────────────
-- 044_university_outreach.sql
--
-- Partner-university outreach: the international / exchange offices of the
-- universities that send exchange students to the University of Michigan.
-- We write to the OFFICE (a role address published on its own site) to ask
-- it to point its outgoing students at Wroomly for housing.
--
-- This is separate from sourced_leads on purpose. Those are private people
-- who posted a sublet; these are institutions reached through a published
-- office address, a different relationship with different rules — above all,
-- NOTHING here sends without a human approving the exact message first.
--
-- Same posture as the other agent tables: RLS-on, ZERO policies. Service role
-- only; the admin pages read and write through the server.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists university_prospects (
  id                        uuid primary key default uuid_generate_v4(),

  slug                      text not null unique,
  name                      text not null,
  country                   text,
  city                      text,
  website                   text,

  -- Which U-M units send/receive exchange students with them
  -- ("Ross", "Engineering (IPE)", "UMSI", …) and a page that shows it.
  umich_units               text[] not null default '{}',
  evidence_url              text,

  -- The office that sends students OUT, and how to reach it. An address is
  -- only ever stored with the page it was read from.
  office_name               text,
  office_page_url           text,
  contact_email             text,
  contact_email_source_url  text,
  contact_kind              text check (contact_kind in ('office', 'named')),
  contact_name              text,
  contact_form_url          text,
  phone                     text,
  -- verified: seen on the office's own page · likely: general address ·
  -- not_found: no address (form / phone only)
  confidence                text not null default 'not_found'
    check (confidence in ('verified', 'likely', 'not_found')),
  notes                     text,

  -- researched → drafted → approved → sent → replied | declined ; skipped = parked
  status                    text not null default 'researched'
    check (status in ('researched', 'drafted', 'approved', 'sent', 'replied', 'declined', 'skipped')),

  -- The message exactly as it would go out.
  subject                   text,
  body                      text,
  -- sha256 of (to, from, reply-to, subject, body) at the moment of approval.
  -- A send recomputes it, so changing ANYTHING after approving — the text,
  -- the recipient, the sender — voids the approval instead of sending
  -- something nobody looked at.
  approved_at               timestamptz,
  approval_hash             text,

  -- What actually went out, frozen at send time, so "what did we send, to
  -- whom, from which address" is answerable later.
  sent_at                   timestamptz,
  sent_message_id           text,
  sent_snapshot             jsonb,

  replied_at                timestamptz,
  reply_note                text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table university_prospects enable row level security;

create index if not exists university_prospects_status_idx on university_prospects (status);
create index if not exists university_prospects_email_idx on university_prospects (lower(contact_email));
create index if not exists university_prospects_sent_idx on university_prospects (sent_at);

drop trigger if exists set_updated_at_on_university_prospects on university_prospects;
create trigger set_updated_at_on_university_prospects
  before update on university_prospects
  for each row execute function update_updated_at();


-- One row: who the emails come from, where replies go, and the email itself.
create table if not exists partner_outreach_settings (
  id           text primary key default 'default' check (id = 'default'),
  from_name    text not null,
  from_email   text not null,
  reply_to     text not null,
  subject      text not null,
  body         text not null,
  daily_cap    integer not null default 10 check (daily_cap between 1 and 50),
  updated_at   timestamptz not null default now()
);

alter table partner_outreach_settings enable row level security;

drop trigger if exists set_updated_at_on_partner_outreach_settings on partner_outreach_settings;
create trigger set_updated_at_on_partner_outreach_settings
  before update on partner_outreach_settings
  for each row execute function update_updated_at();

comment on table university_prospects is
  'Exchange offices at partner universities. Nothing is sent without a human approving the exact message; approval is voided by any later edit.';
comment on table partner_outreach_settings is
  'Sender identity, reply-to, daily cap and the email template for partner-university outreach.';
