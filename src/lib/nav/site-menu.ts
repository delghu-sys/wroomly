/**
 * What the site menu (the "☰ Menu" button, and the phone hamburger) offers.
 * Pure, so who sees what is unit-tested instead of eyeballed per role.
 *
 * Before this, most of the site was only reachable from the footer: guides,
 * buildings, neighborhoods, live rent prices, trust & safety, the exchange
 * overview. The profile-picture menu still exists; it holds account pages only.
 */

export type MenuRole = 'consumer' | 'supplier' | 'admin'

export interface MenuLink {
  href: string
  label: string
  /** One short line under the label on wide screens. */
  hint?: string
  /** A count shown next to the label (unread messages). */
  badge?: number
  /** mailto: and other links that leave the app. */
  external?: boolean
}

export interface MenuSection {
  title: string
  links: MenuLink[]
}

export interface MenuInput {
  /** Null for a signed-out visitor. */
  role: MenuRole | null
  /** Supply-only soft launch: renter product links lead to /coming-soon, so they are hidden. */
  hideRenterNav: boolean
  paymentsEnabled: boolean
  unreadCount: number
  /** A few neighborhoods to link, in the order to show them. */
  neighborhoods: { slug: string; name: string }[]
}

export function buildMenuSections({ role, hideRenterNav, paymentsEnabled, unreadCount, neighborhoods }: MenuInput): MenuSection[] {
  const hosts = role === 'supplier' || role === 'admin'

  const find: MenuLink[] = [
    ...(hideRenterNav
      ? []
      : [
          { href: '/listings', label: 'Browse sublets', hint: 'Every place on Wroomly, with filters' },
          { href: '/match', label: 'Get matched', hint: 'Tell us what you need, we send matches' },
        ]),
    { href: '/buildings', label: 'Buildings', hint: 'Apartment buildings near campus' },
    { href: '/guides/ann-arbor-rent-prices', label: 'Rent prices', hint: 'What sublets cost right now' },
    ...neighborhoods.map(n => ({ href: `/ann-arbor/${n.slug}`, label: n.name })),
  ]

  const hosting: MenuLink[] = [
    { href: '/list-place', label: 'List your place', hint: 'Sublet your room or apartment' },
    { href: '/import-listing', label: 'Import from your post', hint: 'Paste a link, we draft the listing' },
    ...(hosts ? [{ href: '/listings/new', label: 'Create a listing', hint: 'Start a new listing from scratch' }] : []),
    { href: '/guides/how-to-price-your-sublet', label: 'How to price your sublet' },
  ]

  const learn: MenuLink[] = [
    { href: '/guides', label: 'All guides', hint: 'Leases, deposits, scams, timing' },
    { href: '/about', label: 'How it works' },
    { href: '/safety', label: 'Trust & safety' },
    { href: '/exchange', label: 'Exchange students' },
    { href: 'mailto:support@wroomly.app', label: 'Contact us', external: true },
  ]

  const account: MenuLink[] = role
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/messages', label: 'Messages', ...(unreadCount > 0 ? { badge: unreadCount } : {}) },
        { href: '/favorites', label: 'Saved listings' },
        ...(hosts
          ? [
              { href: '/my-listings', label: 'My listings' },
              { href: '/inquiries', label: 'Inquiries' },
              ...(paymentsEnabled ? [{ href: '/payouts', label: 'Payouts' }] : []),
            ]
          : []),
        ...(role === 'consumer'
          ? [
              { href: '/saved-searches', label: 'Saved searches' },
              { href: '/applications', label: 'Applications' },
            ]
          : []),
        ...(role === 'admin' ? [{ href: '/admin', label: 'Admin dashboard' }] : []),
        { href: '/profile', label: 'Profile settings' },
      ]
    : [
        { href: '/sign-in', label: 'Sign in' },
        { href: '/sign-up', label: 'Create account' },
      ]

  return [
    { title: 'Find a place', links: find },
    { title: 'Hosting', links: hosting },
    { title: 'Learn', links: learn },
    { title: role ? 'Your account' : 'Account', links: account },
  ]
}
