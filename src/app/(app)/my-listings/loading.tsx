/** Skeleton for /my-listings — a row list, not a card grid. */
export default function MyListingsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="h-3 w-20 rounded-full shimmer" />
          <div className="h-11 w-56 rounded-2xl shimmer mt-3" />
        </div>
        <div className="h-11 w-36 rounded-full shimmer" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-line rounded-3xl p-6 flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-5 w-48 rounded-full shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              <div className="h-3.5 w-36 rounded-full shimmer opacity-70" style={{ animationDelay: `${i * 0.05}s` }} />
            </div>
            <div className="h-9 w-20 rounded-full shimmer shrink-0" style={{ animationDelay: `${i * 0.05}s` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
