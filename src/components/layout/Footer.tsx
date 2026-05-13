import Link from 'next/link'
import { LogoMark } from '@/components/brand/Logo'

export function Footer() {
  return (
    <footer className="border-t border-line bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <LogoMark size={28} />
              <span className="font-display text-base font-semibold tracking-tighter text-ink">wroomly</span>
            </Link>
            <p className="text-sm text-ink-muted leading-relaxed max-w-xs">
              Make room for connection. Verified student housing for the University of Michigan community.
            </p>
          </div>

          <FooterCol
            title="Browse"
            links={[
              { href: '/listings', label: 'All listings' },
              { href: '/listings?type=sublet', label: 'Sublets' },
              { href: '/listings?type=swap', label: 'Housing swaps' },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { href: '/about', label: 'How it works' },
              { href: '/about#trust', label: 'Trust & safety' },
              { href: 'mailto:hello@wroomly.com', label: 'Contact us', external: true },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { href: '/terms', label: 'Terms of service' },
              { href: '/privacy', label: 'Privacy policy' },
            ]}
          />
        </div>

        <div className="border-t border-line mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Wroomly. Not affiliated with the University of Michigan.
          </p>
          <p className="text-xs text-ink-muted font-display italic">
            Make room for connection.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string; external?: boolean }[]
}) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.15em] font-semibold text-ink mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.href + l.label}>
            {l.external ? (
              <a href={l.href} className="text-sm text-ink-muted hover:text-ink ease-smooth transition-colors">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-sm text-ink-muted hover:text-ink ease-smooth transition-colors">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
