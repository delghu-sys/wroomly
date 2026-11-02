-- ─────────────────────────────────────────────────────────────────────────────
-- 047_university_messages.sql
--
-- The replies inbox: what universities write back, how we read it, and the
-- answer we prepare. Every message is stored once (source + external_id is
-- unique, so syncing twice is harmless) and linked to its university when the
-- sender can be matched.
--
-- Nothing in here sends mail by itself. A prepared reply is just text until a
-- person approves THE EXACT message (hash of to/from/reply-to/subject/body/
-- thread), exactly like the outreach emails.
--
-- Same posture as the other outreach tables: RLS-on, ZERO policies — these
-- hold third parties' emails. Service role only.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists university_messages (
  id                  uuid primary key default uuid_generate_v4(),
  prospect_id         uuid references university_prospects(id) on delete set null,

  -- Where it came from and its id THERE. Syncing the same mailbox twice must
  -- never create a second row.
  source              text not null check (source in ('gmail', 'resend_inbound', 'manual')),
  external_id         text not null,
  message_id_header   text,             -- RFC 5322 Message-ID, so our answer threads under it
  in_reply_to         text,

  from_email          text not null,
  from_name           text,
  to_email            text,
  subject             text,
  body_text           text,
  received_at         timestamptz not null,

  -- How it was read. `kind` is decided by plain rules, never by a model, so an
  -- opt-out can't be missed (or invented) by an AI.
  --   auto_reply  out-of-office / "we received your message"
  --   human_reply a person wrote back
  --   opt_out     asked not to be contacted (we suppress automatically)
  --   bounce      delivery failure notice
  kind                text not null default 'human_reply'
    check (kind in ('auto_reply', 'human_reply', 'opt_out', 'bounce')),
  kind_reason         text,
  -- Model-assisted reading of a HUMAN reply (advisory only).
  intent              text,
  summary             text,
  language            text,
  -- An auto-reply asking us to wait: no follow-up before this.
  hold_followup_until timestamptz,

  -- Handling.
  --   new       needs a person
  --   drafted   a reply is prepared
  --   approved  that exact reply is approved, not yet sent
  --   sent      our reply went out
  --   handled   done (by us, or automatically — auto-replies, bounces, opt-outs)
  --   ignored   a person chose to do nothing
  status              text not null default 'new'
    check (status in ('new', 'drafted', 'approved', 'sent', 'handled', 'ignored')),
  suggested_subject   text,
  suggested_body      text,
  suggested_send_at   timestamptz,
  suggested_send_note text,
  approved_at         timestamptz,
  approval_hash       text,
  reply_sent_at       timestamptz,
  reply_message_id    text,
  reply_snapshot      jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table university_messages enable row level security;

create unique index if not exists university_messages_source_idx on university_messages (source, external_id);
create index if not exists university_messages_prospect_idx on university_messages (prospect_id);
create index if not exists university_messages_status_idx on university_messages (status);
create index if not exists university_messages_received_idx on university_messages (received_at desc);

drop trigger if exists set_updated_at_on_university_messages on university_messages;
create trigger set_updated_at_on_university_messages
  before update on university_messages
  for each row execute function update_updated_at();

comment on table university_messages is
  'Replies from universities and the answers prepared for them. Nothing sends without a person approving the exact message.';
