/**
 * The outreach email: an admin-editable subject + body, with a FIXED footer
 * that can never be edited away.
 *
 * Split on purpose. `body` is what an admin can change from /admin/agents —
 * the actual pitch. The unsubscribe line, the "ignore this and it expires"
 * reassurance, and the CAN-SPAM postal address are appended in code and never
 * stored in the template row, so an edit (or a mistake) can never ship an
 * email missing the parts that are legally required or load-bearing for the
 * "one message, ever, with a working opt-out" promise this pipeline makes.
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

// CAN-SPAM requires a real postal address in every commercial message.
const POSTAL = 'Wroomly LLC, 1912 Geddes Ave, Ann Arbor, MI 48104'

export const DEFAULT_TEMPLATE: OutreachTemplate = {
  subject: 'A listing draft for your Ann Arbor sublet (not published)',
  body: `Hi,

We saw your sublet post ("{{title}}") on the Ann Arbor sublet board.

Wroomly is a free sublet marketplace for the U-M community. We've pre-filled a
listing draft from your post so you don't have to retype it. It is NOT public —
nobody can see it unless you claim it and publish it yourself:

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

/** Full, ready-to-send email: the admin's body plus the fixed, non-editable
 *  footer (opt-out link + postal address). */
export function buildOutreachEmail(
  template: OutreachTemplate,
  vars: { title: string; claimUrl: string; unsubUrl: string },
): { subject: string; text: string } {
  const body = renderTemplate(template.body, vars).trimEnd()
  return {
    subject: template.subject,
    text: `${body}\n\nNever want to hear from us? ${vars.unsubUrl}\n\n${POSTAL}`,
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
