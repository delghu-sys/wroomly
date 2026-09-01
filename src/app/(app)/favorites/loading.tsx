/** Skeleton for /favorites — same card grid as BrandListingCard. */
export default function FavoritesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="h-3 w-28 rounded-full shimmer" />
        <div className="h-11 w-64 rounded-2xl shimmer mt-3" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl overflow-hidden border border-line bg-surface"
          >
            <div
              className="aspect-[4/3] shimmer"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
            <div className="p-5 space-y-3">
              <div className="h-4 w-2/3 rounded-full shimmer" style={{ animationDelay: `${i * 0.04}s` }} />
              <div className="h-3 w-1/2 rounded-full shimmer opacity-70" style={{ animationDelay: `${i * 0.04}s` }} />
              <div className="h-3 w-3/4 rounded-full shimmer opacity-50" style={{ animationDelay: `${i * 0.04}s` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
