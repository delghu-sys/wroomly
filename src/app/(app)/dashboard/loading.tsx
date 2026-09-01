/**
 * Skeleton for /dashboard — shape matches both the supplier and consumer
 * variants (they only differ in copy and stat labels, not layout): a
 * greeting header, three stat cards, then a list section.
 */
export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <div className="h-3 w-32 rounded-full shimmer" />
        <div className="h-11 w-80 rounded-2xl shimmer mt-3" />
        <div className="h-4 w-56 rounded-full shimmer opacity-70 mt-3" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-3xl border border-line p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded-full shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="h-9 w-12 rounded-xl shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              </div>
              <div className="w-11 h-11 rounded-2xl shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-3xl border border-line overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div className="h-6 w-40 rounded-lg shimmer" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="h-4 w-48 rounded-full shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              <div className="h-6 w-20 rounded-full shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
