import 'server-only'
import { getListingImageUrl } from '@/lib/utils/listing'

/**
 * Wroomly Match email templates — welcome (on opt-in) + match alert
 * (single / digest). On-brand: navy #0E2A47, blue #2F6BFF, maize #F5B82E.
 *
 * CAN-SPAM: every send carries a one-click unsubscribe link (+ List-Unsubscribe
 * headers, set by the caller), a manage-preferences link, and a physical postal
 * address. We only ever pass addresses that opted in via the /match flow.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

// Reply/contact address shown in the footer of every Match email.
const CONTACT_EMAIL = 'delghu@gmail.com'

// CAN-SPAM requires a valid *physical* postal address in every commercial email
// (an email address does NOT satisfy this). Overridable via env without a code
// change; defaults to Wroomly's mailing address.
const POSTAL_ADDRESS =
  process.env.MATCH_POSTAL_ADDRESS ?? 'Wroomly · 2232 S Main St, Ann Arbor, MI 48103'

const NAVY = '#0E2A47'
const BLUE = '#2F6BFF'
const MAIZE = '#F5B82E'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function manageUrl(token: string): string {
  return `${APP_URL}/match/manage?token=${encodeURIComponent(token)}`
}

export function unsubscribeUrl(token: string): string {
  return `${APP_URL}/api/match/unsubscribe?token=${encodeURIComponent(token)}`
}

export function feedbackUrl(token: string, sendId: string, v: 'up' | 'down'): string {
  return `${APP_URL}/api/match/feedback?token=${encodeURIComponent(token)}&send=${encodeURIComponent(sendId)}&v=${v}`
}

function shell(opts: {
  preheader: string
  bodyHtml: string
  token: string
}): string {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${NAVY};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,0.05),0 8px 28px rgba(14,42,71,0.08);">
<tr><td style="padding:24px 32px;background:${NAVY};">
<a href="${APP_URL}" style="text-decoration:none;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">
<img src="${APP_URL}/logo.png" alt="" width="22" height="22" style="vertical-align:middle;margin-right:8px;border-radius:6px;" />wroomly
<span style="color:rgba(255,255,255,0.45);font-weight:500;font-size:14px;">/ Match</span></a></td></tr>
<tr><td style="padding:32px;">${opts.bodyHtml}</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #e7ebf2;background:#fafbfd;">
<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6b7686;">
You're getting this because you asked Wroomly Match to watch for places matching your search.
<a href="${manageUrl(opts.token)}" style="color:${BLUE};text-decoration:underline;">Manage preferences</a>
&nbsp;·&nbsp;
<a href="${unsubscribeUrl(opts.token)}" style="color:${BLUE};text-decoration:underline;">Unsubscribe</a>
</p>
<p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6b7686;">
Questions? <a href="mailto:${CONTACT_EMAIL}" style="color:${BLUE};text-decoration:underline;">${CONTACT_EMAIL}</a>
</p>
<p style="margin:0;font-size:11px;line-height:1.5;color:#9aa3b2;">${escapeHtml(POSTAL_ADDRESS)}</p>
</td></tr>
</table></td></tr></table></body></html>`
}

export interface MatchEmailListing {
  id: string
  title: string
  price_per_month: number | null
  neighborhood: string | null
  bedrooms: number | null
  available_from: string | null
  available_to: string | null
  first_image_path: string | null
  /** 0–100 engine score, shown as the match badge. */
  score: number
  /** The LLM-written personal note (why it fits, one honest caveat, timing). */
  note: string
  /** Send-row id powering the thumbs feedback links. */
  send_id: string
}

function listingCard(l: MatchEmailListing, token: string, rank: number | null): string {
  const price = l.price_per_month
    ? `$${(l.price_per_month / 100).toLocaleString()}/mo`
    : ''
  const meta = [
    l.bedrooms === 0 ? 'Studio' : l.bedrooms ? `${l.bedrooms} bed` : null,
    l.neighborhood,
    price,
  ]
    .filter(Boolean)
    .join(' · ')
  const img = l.first_image_path ? getListingImageUrl(l.first_image_path) : null

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:18px;border:1px solid #e7ebf2;border-radius:16px;overflow:hidden;">
${img ? `<tr><td style="position:relative;"><img src="${img}" alt="" width="560" style="display:block;width:100%;max-height:220px;object-fit:cover;" /></td></tr>` : ''}
<tr><td style="padding:16px 18px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="vertical-align:top;">
${rank != null ? `<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b8860b;">#${rank} pick</p>` : ''}
<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${NAVY};letter-spacing:-0.01em;line-height:1.25;">${escapeHtml(l.title)}</p>
<p style="margin:0 0 10px;font-size:13px;color:#6b7686;">${escapeHtml(meta)}</p>
</td>
<td style="vertical-align:top;text-align:right;width:72px;">
<span style="display:inline-block;background:${NAVY};color:${MAIZE};font-size:13px;font-weight:800;border-radius:999px;padding:7px 12px;">${l.score}%</span>
</td>
</tr></table>
<p style="margin:0 0 14px;font-size:13.5px;color:#37455a;background:#f6f8fc;border-left:3px solid ${MAIZE};border-radius:0 10px 10px 0;padding:10px 12px;line-height:1.55;">${escapeHtml(l.note)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td>
<a href="${APP_URL}/listings/${l.id}" style="display:inline-block;background:${MAIZE};color:${NAVY};font-size:13px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:999px;">View this place →</a>
</td>
<td style="text-align:right;font-size:12px;color:#6b7686;white-space:nowrap;">
<a href="${feedbackUrl(token, l.send_id, 'up')}" style="display:inline-block;text-decoration:none;border:1px solid #e7ebf2;border-radius:999px;padding:8px 12px;color:${NAVY};font-size:13px;margin-right:6px;">👍</a>
<a href="${feedbackUrl(token, l.send_id, 'down')}" style="display:inline-block;text-decoration:none;border:1px solid #e7ebf2;border-radius:999px;padding:8px 12px;color:${NAVY};font-size:13px;">👎</a>
</td>
</tr></table>
</td></tr></table>`
}

/** Sent immediately on opt-in (single opt-in). Confirms the alert is live. */
export function matchWelcomeEmail(opts: {
  tags: string[]
  summary?: string | null
  token: string
}) {
  const tagsHtml = opts.tags.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td>${opts.tags
        .map(
          t =>
            `<span style="display:inline-block;background:#fff6e0;border:1px solid ${MAIZE};color:${NAVY};border-radius:999px;padding:5px 11px;font-size:12.5px;margin:0 6px 6px 0;">${escapeHtml(t)}</span>`,
        )
        .join('')}</td></tr></table>`
    : ''

  const summaryHtml = opts.summary
    ? `<p style="margin:0 0 18px;font-size:13.5px;color:#37455a;background:#f6f8fc;border-left:3px solid ${MAIZE};border-radius:0 10px 10px 0;padding:10px 12px;line-height:1.55;">${escapeHtml(opts.summary)}</p>`
    : ''

  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#b8860b;">You're all set</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:${NAVY};font-weight:700;">
      We'll watch for your place.
    </h1>
    <p style="margin:0 0 18px;font-size:14px;color:#4a5666;line-height:1.55;">
      The moment a Wroomly listing scores well against your profile, you'll get a personal note on why it fits — usually before it spreads anywhere else. Here's what we heard:
    </p>
    ${summaryHtml}
    ${tagsHtml}
    <p style="margin:0;font-size:13px;color:#6b7686;line-height:1.5;">
      You're also first in line for Wroomly's renter launch. Need to tweak anything?
      <a href="${manageUrl(opts.token)}" style="color:${BLUE};text-decoration:underline;">Update your preferences</a> any time.
    </p>
  `

  return {
    subject: `You're on the list — we'll email you when a match drops`,
    html: shell({
      preheader: `Wroomly Match is now watching for places that fit your profile.`,
      bodyHtml: body,
      token: opts.token,
    }),
  }
}

/** A match email — one scored listing, or a ranked digest of the top few. */
export function matchAlertEmail(opts: {
  listings: MatchEmailListing[] // ranked best-first
  subject: string
  token: string
}) {
  const count = opts.listings.length
  const cardsHtml = opts.listings
    .map((l, i) => listingCard(l, opts.token, count > 1 ? i + 1 : null))
    .join('')

  const heading =
    count === 1 ? `This one fits your profile.` : `Your top ${count}, ranked.`
  const eyebrow = count === 1 ? 'New match' : 'Your matches'

  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#b8860b;">${eyebrow}</p>
    <h1 style="margin:0 0 18px;font-size:23px;line-height:1.2;letter-spacing:-0.02em;color:${NAVY};font-weight:700;">
      ${heading}
    </h1>
    ${cardsHtml}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7686;line-height:1.5;">
      Good Ann Arbor places move in days — the fastest inquiry usually wins.
      The 👍 / 👎 buttons teach your matches to get sharper.
    </p>
  `

  return {
    subject: opts.subject,
    html: shell({
      preheader:
        count === 1
          ? `A Wroomly listing scored ${opts.listings[0].score}% against your profile.`
          : `${count} Wroomly listings scored well against your profile — ranked for you.`,
      bodyHtml: body,
      token: opts.token,
    }),
  }
}
