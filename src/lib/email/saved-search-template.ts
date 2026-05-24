import 'server-only'
import { getListingImageUrl } from '@/lib/utils/listing'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shell(opts: { preheader: string; bodyHtml: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5f0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.05);">
<tr><td style="padding:28px 32px 16px;border-bottom:1px solid #ece8df;">
<a href="${APP_URL}" style="text-decoration:none;color:#1a1a2e;font-size:22px;font-weight:700;letter-spacing:-0.02em;">
<span style="color:#e8b73f;">w</span>roomly</a></td></tr>
<tr><td style="padding:32px;">${opts.bodyHtml}</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #ece8df;background:#fafaf6;">
<p style="margin:0;font-size:12px;line-height:1.5;color:#6b6b7a;">
Manage your saved searches or turn off these alerts at
<a href="${APP_URL}/saved-searches" style="color:#4a4a5a;text-decoration:underline;">${APP_URL}/saved-searches</a>.</p>
</td></tr>
</table></td></tr></table></body></html>`
}

export interface AlertListing {
  id: string
  title: string
  price_per_month: number | null
  neighborhood: string | null
  bedrooms: number | null
  first_image_path: string | null
}

export function savedSearchAlertEmail(opts: {
  consumerName: string | null
  searchSummary: string
  listings: AlertListing[]
}) {
  const first = (opts.consumerName ?? 'there').split(' ')[0]
  const count = opts.listings.length
  const listingsHtml = opts.listings.map(l => {
    const price = l.price_per_month
      ? `$${(l.price_per_month / 100).toLocaleString()}/mo`
      : ''
    const meta = [
      l.bedrooms === 0
        ? 'Studio'
        : l.bedrooms
          ? `${l.bedrooms} bed`
          : null,
      l.neighborhood,
      price,
    ]
      .filter(Boolean)
      .join(' · ')
    const img = l.first_image_path ? getListingImageUrl(l.first_image_path) : null

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:14px;border:1px solid #ece8df;border-radius:14px;overflow:hidden;">
<tr>
${img ? `<td style="width:96px;background:#f7f5f0;"><img src="${img}" alt="" width="96" height="96" style="display:block;object-fit:cover;width:96px;height:96px;" /></td>` : ''}
<td style="padding:14px 16px;">
<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:-0.01em;line-height:1.25;">${escapeHtml(l.title)}</p>
<p style="margin:0 0 10px;font-size:12.5px;color:#6b6b7a;">${escapeHtml(meta)}</p>
<a href="${APP_URL}/listings/${l.id}" style="font-size:12px;font-weight:600;color:#9a7a1e;text-decoration:none;">View listing →</a>
</td>
</tr></table>`
  }).join('')

  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#9a7a1e;">Saved search alert</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:#1a1a2e;font-weight:600;">
      ${escapeHtml(first)} — ${count} new ${count === 1 ? 'place' : 'places'} match your search.
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#4a4a5a;line-height:1.55;">
      Your saved filters: <em style="color:#1a1a2e;">${escapeHtml(opts.searchSummary)}</em>
    </p>
    ${listingsHtml}
    <p style="margin:24px 0 0;font-size:13px;color:#6b6b7a;line-height:1.5;">
      The fastest reply usually wins. Send an inquiry if anything catches your eye.
    </p>
  `

  return {
    subject: `${count} new ${count === 1 ? 'match' : 'matches'} for your saved search`,
    html: shell({
      preheader: `${count} new ${count === 1 ? 'place' : 'places'} on Wroomly match your saved filters`,
      bodyHtml: body,
    }),
  }
}
