-- Legal enforceability pack: clickwrap evidence, fair-housing flag log,
-- report detail. Companion to the legal-pages implementation package.

-- ── Clickwrap acceptance log ────────────────────────────────────────────────
-- One row per affirmative acceptance of the Terms + Privacy Policy. This is
-- the evidence that makes the arbitration clause / liability cap defensible:
-- courts enforce clickwrap (an affirmative checkbox) and routinely refuse
-- browsewrap (a footer link). Written ONLY server-side (callback route and
-- /api/legal/accept) under the service role, with the version stamped from
-- src/lib/legal.ts — never from client input.
create table legal_acceptances (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references users(id) on delete cascade,
  accepted_at        timestamptz not null default now(),
  ip_address         inet,
  user_agent         text,
  terms_version      text not null,
  privacy_version    text not null,
  acceptance_context text not null default 'signup' -- 'signup' | 'reacceptance'
);

create index legal_acceptances_user_idx on legal_acceptances (user_id, accepted_at desc);

-- Service-role access only: no authenticated policies on purpose. Reads and
-- writes go through server routes so ip/user_agent/version are trustworthy.
alter table legal_acceptances enable row level security;

-- ── Fair-housing flag log ───────────────────────────────────────────────────
-- Every time the listing-form guardrail matches a phrase, log it so the
-- keyword list can be tuned from real data (false-positive rate, whether the
-- warning taught the user to edit). Warn-not-block by design; this table is
-- the feedback loop.
create table fair_housing_flags (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references users(id) on delete set null,
  matched_phrase text not null,
  field          text not null,            -- 'title' | 'description'
  -- Whether the text still matched when the user finally submitted:
  -- false = they edited it away (the warning worked), true = submitted as-is.
  submitted_with_match boolean,
  created_at     timestamptz not null default now()
);

create index fair_housing_flags_phrase_idx on fair_housing_flags (matched_phrase);

alter table fair_housing_flags enable row level security;

-- ── Reports: free-text detail ───────────────────────────────────────────────
-- The report modal collects an optional free-text elaboration on the reason.
alter table reports add column if not exists detail text;
