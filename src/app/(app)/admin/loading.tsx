import { PageShell, PageHeading, StatCards } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-6xl">
      <PageHeading />
      <StatCards count={4} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-line rounded-3xl p-6 space-y-3">
            <div className="shimmer w-10 h-10 rounded-2xl" style={{ animationDelay: `${i * 0.05}s` }} />
            <div className="shimmer h-5 w-32 rounded-full" style={{ animationDelay: `${i * 0.05}s` }} />
            <div className="shimmer h-3 w-48 rounded-full opacity-60" style={{ animationDelay: `${i * 0.05}s` }} />
          </div>
        ))}
      </div>
    </PageShell>
  )
}
