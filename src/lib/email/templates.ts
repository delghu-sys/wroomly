import 'server-only'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

/**
 * Shared shell — branded header, body slot, footer.
 *
 * Inline styles only. Email clients (Gmail, Outlook, Apple Mail) strip
 * <style> blocks unpredictably; inline styles are the only thing that
 * renders consistently. No external assets — logo is just text.
 */
function shell(opts: { preheader: string; bodyHtml: string }): string {
  const { preheader, bodyHtml } = opts
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>Wroomly</title>
  </head>
  <body style="margin:0; padding:0; background:#f7f5f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a2e; -webkit-font-smoothing:antialiased;">
    <!-- Preheader (hidden, shown as preview text in inbox) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);">

            <!-- Header — brand bar -->
            <tr>
              <td style="padding:28px 32px 16px 32px; border-bottom:1px solid #ece8df;">
                <a href="${APP_URL}" style="text-decoration:none; color:#1a1a2e; font-size:22px; font-weight:700; letter-spacing:-0.02em;">
                  <span style="color:#e8b73f;">w</span>roomly
                </a>
              </td>
            </tr>

            <!-- Body slot -->
            <tr>
              <td style="padding:32px 32px 36px 32px;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px 28px 32px; border-top:1px solid #ece8df; background:#fafaf6;">
                <p style="margin:0; font-size:12px; line-height:1.5; color:#6b6b7a;">
                  You're receiving this because you have a Wroomly account.
                  Questions? Email
                  <a href="mailto:help@wroomly.app" style="color:#4a4a5a; text-decoration:underline;">help@wroomly.app</a>.
                </p>
                <p style="margin:8px 0 0 0; font-size:11px; line-height:1.5; color:#a0a0aa;">
                  Wroomly · Verified U of M student housing · Ann Arbor, MI
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** CTA button — same styling everywhere for consistency. */
function ctaButton(opts: { href: string; label: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
    <tr>
      <td style="background:#e8b73f; border-radius:9999px;">
        <a href="${opts.href}" style="display:inline-block; padding:14px 28px; color:#1a1a2e; font-size:14px; font-weight:600; text-decoration:none; letter-spacing:-0.01em;">
          ${escapeHtml(opts.label)}
        </a>
      </td>
    </tr>
  </table>`
}

// Tiny escape — only used on user-provided strings inserted into HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────

export function importReviewAdminEmail(opts: {
  reviewUrl: string
  submitterEmail: string
  listingTitle: string | null
}) {
  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#9a7a1e;">Admin · needs review</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:#1a1a2e;font-weight:600;">
      New AI import to review
    </h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#4a4a5a;">
      Submitted by <strong style="color:#1a1a2e;">${escapeHtml(opts.submitterEmail)}</strong>.
      ${opts.listingTitle ? `Draft title: <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong>.` : ''}
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4a5a;">
      Review what they submitted vs. what the AI created, edit if needed, then
      approve. The submitter only gets their claim email <strong style="color:#1a1a2e;">after you approve</strong>.
    </p>
    ${ctaButton({ href: opts.reviewUrl, label: 'Review this import →' })}
  `
  return {
    subject: `Review needed: AI import from ${opts.submitterEmail}`,
    html: shell({
      preheader: `An AI listing import from ${opts.submitterEmail} is waiting for your approval.`,
      bodyHtml: body,
    }),
  }
}

export function listingImportClaimEmail(opts: {
  claimUrl: string
  listingTitle: string | null
}) {
  const titleLine = opts.listingTitle
    ? `We turned your post into a draft: <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong>.`
    : 'We created a Wroomly draft from your existing sublet post.'

  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#9a7a1e;">Your draft is ready</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:#1a1a2e;font-weight:600;">
      Review &amp; publish your Wroomly listing
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4a5a;">
      ${titleLine} Click below to review the details, create your account, and
      publish it. <strong style="color:#1a1a2e;">Nothing goes live until you confirm.</strong>
    </p>
    ${ctaButton({ href: opts.claimUrl, label: 'Review my listing →' })}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b6b7a;">
      AI can make mistakes — please check the rent, dates, and details before
      publishing. This link expires in 7 days.
    </p>
  `

  return {
    subject: 'Your Wroomly listing draft is ready',
    html: shell({
      preheader: 'Review and publish your Wroomly draft — nothing goes live until you confirm.',
      bodyHtml: body,
    }),
  }
}

export function inquiryReceivedEmail(opts: {
  supplierName: string | null
  consumerName: string | null
  listingTitle: string
  inquiryMessage: string
  conversationUrl: string
}) {
  const supplierFirst = (opts.supplierName ?? 'there').split(' ')[0]
  const consumerName = opts.consumerName ?? 'A verified student'
  const messagePreview = opts.inquiryMessage.slice(0, 240)

  const body = `
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#9a7a1e;">New inquiry</p>
    <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.2; letter-spacing:-0.02em; color:#1a1a2e; font-weight:600;">
      ${escapeHtml(supplierFirst)} — someone wants to book ${escapeHtml(opts.listingTitle)}.
    </h1>
    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.55; color:#4a4a5a;">
      <strong style="color:#1a1a2e;">${escapeHtml(consumerName)}</strong>
      sent you an inquiry. Their message:
    </p>
    <blockquote style="margin:0 0 28px 0; padding:16px 20px; border-left:3px solid #e8b73f; background:#fdfaf2; border-radius:8px; font-size:14px; line-height:1.55; color:#3a3a4a; font-style:italic;">
      ${escapeHtml(messagePreview)}${opts.inquiryMessage.length > 240 ? '…' : ''}
    </blockquote>
    ${ctaButton({ href: opts.conversationUrl, label: 'Reply or accept →' })}
    <p style="margin:20px 0 0 0; font-size:13px; line-height:1.5; color:#6b6b7a;">
      Accepted inquiries unlock payment for the consumer. The fastest reply usually wins.
    </p>
  `

  return {
    subject: `${consumerName} wants to book your place`,
    html: shell({
      preheader: `Inquiry for ${opts.listingTitle} from ${consumerName}`,
      bodyHtml: body,
    }),
  }
}

export function inquiryAcceptedEmail(opts: {
  consumerName: string | null
  supplierName: string | null
  listingTitle: string
  conversationUrl: string
}) {
  const consumerFirst = (opts.consumerName ?? 'there').split(' ')[0]
  const supplierFirst = (opts.supplierName ?? 'your host').split(' ')[0]

  const body = `
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#4a8d4a;">Inquiry accepted</p>
    <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.2; letter-spacing:-0.02em; color:#1a1a2e; font-weight:600;">
      ${escapeHtml(consumerFirst)} — ${escapeHtml(supplierFirst)} accepted your inquiry.
    </h1>
    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.55; color:#4a4a5a;">
      Your inquiry for <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong>
      is approved. The place isn't reserved until you pay — multiple people can be accepted,
      whoever pays first gets it.
    </p>
    ${ctaButton({ href: opts.conversationUrl, label: 'Pay & confirm →' })}
    <p style="margin:20px 0 0 0; font-size:13px; line-height:1.5; color:#6b6b7a;">
      You'll pay first month's rent + deposit + 5% fee + processing through Wroomly.
      Months 2+ you arrange directly with ${escapeHtml(supplierFirst)}.
    </p>
  `

  return {
    subject: `${supplierFirst} accepted your inquiry — pay to lock it in`,
    html: shell({
      preheader: `Pay now to reserve ${opts.listingTitle}`,
      bodyHtml: body,
    }),
  }
}

export function inquiryDeclinedEmail(opts: {
  consumerName: string | null
  listingTitle: string
  browseUrl: string
}) {
  const consumerFirst = (opts.consumerName ?? 'there').split(' ')[0]

  const body = `
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#9a4a4a;">Inquiry declined</p>
    <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.2; letter-spacing:-0.02em; color:#1a1a2e; font-weight:600;">
      ${escapeHtml(consumerFirst)} — your inquiry wasn't accepted.
    </h1>
    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.55; color:#4a4a5a;">
      The host declined your inquiry for <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong>.
      It happens — could be timing, dates, or any number of things. Plenty of other places.
    </p>
    ${ctaButton({ href: opts.browseUrl, label: 'Browse other places →' })}
  `

  return {
    subject: `Your inquiry for ${opts.listingTitle} wasn't accepted`,
    html: shell({
      preheader: 'Browse other places — plenty more available',
      bodyHtml: body,
    }),
  }
}

export function paymentConfirmedConsumerEmail(opts: {
  consumerName: string | null
  listingTitle: string
  amountPaid: string // already formatted like "$1,596.61"
  moveInDate: string | null // formatted like "Sep 1, 2027" or null
  conversationUrl: string
}) {
  const consumerFirst = (opts.consumerName ?? 'there').split(' ')[0]

  const body = `
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#4a8d4a;">Booking confirmed</p>
    <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.2; letter-spacing:-0.02em; color:#1a1a2e; font-weight:600;">
      ${escapeHtml(consumerFirst)} — you're booked.
    </h1>
    <p style="margin:0 0 20px 0; font-size:15px; line-height:1.55; color:#4a4a5a;">
      <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong> is yours.
      We charged <strong style="color:#1a1a2e;">${escapeHtml(opts.amountPaid)}</strong>
      ${opts.moveInDate ? `for first month + deposit. Move-in is <strong style="color:#1a1a2e;">${escapeHtml(opts.moveInDate)}</strong>.` : 'for first month + deposit.'}
    </p>
    <p style="margin:0 0 24px 0; font-size:14px; line-height:1.55; color:#4a4a5a;">
      You'll arrange months 2+ directly with your host.
      Keep using the Wroomly chat — that's where your booking lives.
    </p>
    ${ctaButton({ href: opts.conversationUrl, label: 'Open chat →' })}
  `

  return {
    subject: `Booking confirmed: ${opts.listingTitle}`,
    html: shell({
      preheader: `You paid ${opts.amountPaid} — ${opts.listingTitle} is yours.`,
      bodyHtml: body,
    }),
  }
}

export function paymentConfirmedSupplierEmail(opts: {
  supplierName: string | null
  consumerName: string | null
  listingTitle: string
  supplierAmount: string // formatted "$1,500.00" — what they actually receive
  payoutsUrl: string
}) {
  const supplierFirst = (opts.supplierName ?? 'there').split(' ')[0]
  const consumerName = opts.consumerName ?? 'Your consumer'

  const body = `
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#4a8d4a;">Payment received</p>
    <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.2; letter-spacing:-0.02em; color:#1a1a2e; font-weight:600;">
      ${escapeHtml(supplierFirst)} — ${escapeHtml(consumerName)} just paid.
    </h1>
    <p style="margin:0 0 20px 0; font-size:15px; line-height:1.55; color:#4a4a5a;">
      First month + deposit for <strong style="color:#1a1a2e;">${escapeHtml(opts.listingTitle)}</strong>
      is on its way to your Stripe account.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0; background:#fdfaf2; border:1px solid #f0e4b8; border-radius:12px; padding:14px 18px; width:100%;">
      <tr>
        <td style="font-size:13px; color:#6b6b7a;">Your share</td>
        <td align="right" style="font-size:18px; font-weight:600; color:#1a1a2e; letter-spacing:-0.02em;">
          ${escapeHtml(opts.supplierAmount)}
        </td>
      </tr>
    </table>
    ${ctaButton({ href: opts.payoutsUrl, label: 'View payouts →' })}
    <p style="margin:20px 0 0 0; font-size:13px; line-height:1.5; color:#6b6b7a;">
      Stripe typically settles to your bank in 2-3 business days. You'll arrange
      months 2+ with ${escapeHtml(consumerName)} directly.
    </p>
  `

  return {
    subject: `${consumerName} paid for ${opts.listingTitle}`,
    html: shell({
      preheader: `${opts.supplierAmount} on its way to your account`,
      bodyHtml: body,
    }),
  }
}
