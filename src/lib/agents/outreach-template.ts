/**
 * The outreach email: an admin-editable subject + body. No footer is
 * appended in code.
 *
 * NOTE: this used to always append an unsubscribe link + CAN-SPAM postal
 * address, appended in code so an edit couldn't strip them. That footer was
 * deliberately removed at Hugo's request (2026-09-20), against the
 * assistant's advice — see the git history for `outreach-template.ts` if it
 * ever needs restoring. Sending unsolicited commercial email without a
 * working opt-out and a postal address is a CAN-SPAM violation with
 * per-email fine exposure; this file no longer enforces either, so that
 * exposure now sits wherever DEFAULT_TEMPLATE.body is sent from.
 *
 * `body` is what an admin can change from /admin/agents — the actual pitch.
 * May reference {{title}} and {{claimUrl}}.
 *
 * Pure and dependency-free, like outreach-policy.ts: no server-only import,
 * so it can run in the admin API route, the CLI script, AND the client
 * component that renders a live preview as the admin types.
 */

export interface OutreachTemplate {
  subject: string
  /** The editable pitch. May reference {{title}} and {{claimUrl}}. */
  body: string
}

export const DEFAULT_TEMPLATE: OutreachTemplate = {
  subject: 'A listing draft for your Ann Arbor sublet (not published)',
  body: `Hi,

We saw your sublet post ("{{title}}") on the Ann Arbor sublet board.

Wroomly is a free sublet marketplace for the U-M community. We've pre-filled a
listing draft from your post so you don't have to retype it. It is NOT public,
and nobody can see it unless you claim it and publish it yourself:

{{claimUrl}}

The link works for 7 days. If you're not interested, ignore this and nothing
happens: the draft expires unpublished and we won't email you again.`,
}

const PLACEHOLDER_PATTERN = /\{\{\s*(title|claimUrl)\s*\}\}/g

/** {{title}} / {{claimUrl}} substitution. Any other {{...}} is left as-is
 *  rather than silently dropped, so a typo in the template is visible. */
export function renderTemplate(
  template: string,
  vars: { title: string; claimUrl: string },
): string {
  return template.replace(PLACEHOLDER_PATTERN, (_, key: 'title' | 'claimUrl') => vars[key])
}

/** Full, ready-to-send email: just the admin's body, rendered. No footer. */
export function buildOutreachEmail(
  template: OutreachTemplate,
  vars: { title: string; claimUrl: string },
): { subject: string; text: string } {
  const body = renderTemplate(template.body, vars).trimEnd()
  return {
    subject: template.subject,
    text: body,
  }
}

/** Which placeholders a candidate template actually uses — surfaced in the
 *  editor so a template that forgot {{claimUrl}} (the one thing that makes
 *  the email useful at all) is caught before saving, not after sending. */
export function templatePlaceholders(body: string): Set<'title' | 'claimUrl'> {
  const found = new Set<'title' | 'claimUrl'>()
  for (const m of body.matchAll(PLACEHOLDER_PATTERN)) found.add(m[1] as 'title' | 'claimUrl')
  return found
}
