/**
 * Policy versions, as date strings. Bumping one of these is what triggers the
 * re-acceptance prompt for every logged-in user (see LegalReacceptance), so
 * bump them ONLY when the published policy text actually changes — and
 * remember the Terms promise 14 days' notice for material changes.
 *
 * These are the values written into legal_acceptances rows. The client never
 * sends a version; the server stamps rows from these constants so a tampered
 * request can't claim acceptance of something else.
 */
export const TERMS_VERSION = '2026-08-31'
export const PRIVACY_VERSION = '2026-08-31'
