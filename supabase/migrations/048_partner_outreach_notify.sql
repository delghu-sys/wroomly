-- ─────────────────────────────────────────────────────────────────────────────
-- 048_partner_outreach_notify.sql
--
-- Where to tell the operator that a university replied.
--
-- Once replies are received automatically (Resend inbound), the Reply-to
-- address becomes one on the receiving subdomain — not an inbox a person reads.
-- So "where do I get told?" needs its own setting. Blank means: fall back to the
-- Reply-to if that is a normal mailbox (see notifyTarget in code).
-- ─────────────────────────────────────────────────────────────────────────────

alter table partner_outreach_settings
  add column if not exists notify_email text not null default '';
