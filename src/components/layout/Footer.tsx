import Link from 'next/link'
import { LogoMark } from '@/components/brand/Logo'

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-navy text-white mt-auto overflow-hidden">
      {/* Decorative background elements */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full -z-0 blur-3xl opacity-20"
        style={{ background: 'radial-gradient(closest-side, oklch(0.86 0.17 92 / 0.4), transparent)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full -z-0 blur-3xl opacity-15"
        style={{ background: 'radial-gradient(closest-side, oklch(0.5 0.1 257 / 0.5), transparent)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <LogoMark size={28} />
              <span className="font-display text-base font-semibold tracking-tighter text-white">wroomly</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
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

        <div className="border-t border-white/10 mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} Wroomly. Not affiliated with the University of Michigan.
          </p>
          <p className="text-xs text-maize/60 font-display italic">
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
      <h4 className="text-xs uppercase tracking-[0.15em] font-semibold text-maize mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.href + l.label}>
            {l.external ? (
              <a href={l.href} className="text-sm text-white/70 hover:text-white ease-smooth transition-colors">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-sm text-white/70 hover:text-white ease-smooth transition-colors">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
