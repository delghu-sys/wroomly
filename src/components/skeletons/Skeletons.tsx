/**
 * Shared loading-skeleton primitives.
 *
 * Every route with a server-side data fetch gets a loading.tsx so the app
 * never looks frozen while Supabase answers. Composing these keeps ~25 such
 * files short and, more importantly, consistent: one shimmer, one rhythm, one
 * set of radii. If the loading language needs to change, it changes here.
 *
 * `.shimmer` is the existing brand animation in globals.css, already muted by
 * the prefers-reduced-motion block there — so these are quiet by default for
 * anyone who asked for that.
 *
 * These are decorative placeholders: they carry no text, so they're hidden
 * from assistive tech. Next announces the route change itself.
 */

/** One shimmering bar. `delay` staggers siblings so a list ripples. */
export function Bar({
  className = '',
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  return (
    <div
      className={`shimmer rounded-full ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    />
  )
}

/** The eyebrow + display-heading block nearly every page opens with. */
export function PageHeading({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-8">
      <Bar className="h-3 w-28" />
      <Bar className={`h-11 rounded-2xl mt-3 ${wide ? 'w-80' : 'w-64'}`} />
    </div>
  )
}

/** Listing-card grid — matches BrandListingCard's 4:3 cover + text block. */
export function CardGrid({
  count = 6,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl overflow-hidden border border-line bg-surface"
        >
          <div className="shimmer aspect-[4/3]" style={{ animationDelay: `${i * 0.04}s` }} />
          <div className="p-5 space-y-3">
            <Bar className="h-4 w-2/3" delay={i * 0.04} />
            <Bar className="h-3 w-1/2 opacity-70" delay={i * 0.04} />
            <Bar className="h-3 w-3/4 opacity-50" delay={i * 0.04} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Stacked rows: applications, inquiries, saved searches, admin tables. */
export function RowList({
  count = 4,
  lines = 2,
}: {
  count?: number
  lines?: number
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-line rounded-3xl p-6 flex items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1 space-y-2.5">
            <Bar className="h-5 w-48" delay={i * 0.05} />
            {lines > 1 && <Bar className="h-3.5 w-36 opacity-70" delay={i * 0.05} />}
            {lines > 2 && <Bar className="h-3.5 w-56 opacity-50" delay={i * 0.05} />}
          </div>
          <Bar className="h-9 w-20 shrink-0" delay={i * 0.05} />
        </div>
      ))}
    </div>
  )
}

/** The three-across metric cards on dashboard and admin. */
export function StatCards({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count === 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'} gap-4 mb-10`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface rounded-3xl border border-line p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Bar className="h-3 w-24" delay={i * 0.05} />
              <Bar className="h-9 w-12 rounded-xl" delay={i * 0.05} />
            </div>
            <Bar className="w-11 h-11 rounded-2xl" delay={i * 0.05} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Label + input pairs, for the wizard/edit/profile forms. */
export function FormFields({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-24" delay={i * 0.05} />
          <Bar className="h-11 w-full rounded-2xl" delay={i * 0.05} />
        </div>
      ))}
      <Bar className="h-11 w-40 mt-2" />
    </div>
  )
}

/** Standard page wrapper so each loading.tsx matches its page's container. */
export function PageShell({
  children,
  width = 'max-w-7xl',
  className = 'py-10',
}: {
  children: React.ReactNode
  width?: string
  className?: string
}) {
  return (
    <div className={`${width} mx-auto px-4 sm:px-6 lg:px-8 ${className}`} aria-hidden>
      {children}
    </div>
  )
}
