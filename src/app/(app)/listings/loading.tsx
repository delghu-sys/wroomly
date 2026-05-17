import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'

/**
 * Skeleton for /listings — preserves the dark atmospheric hero so the
 * transition from cached → fresh data feels continuous, then renders
 * shimmering placeholders for the grid below.
 */
export default function ListingsLoading() {
  return (
    <div className="min-h-[100dvh]">
      <section className="relative isolate overflow-hidden -mt-16 pt-16">
        <AtmosphericBackground variant="hero" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
          <div className="h-7 w-44 rounded-full bg-white/[0.06]" />
          <div className="h-14 w-72 rounded-2xl bg-white/[0.07] mt-7" />
          <div className="h-14 w-56 rounded-2xl bg-white/[0.05] mt-3" />
          <div className="mt-9 flex gap-3">
            <div className="h-12 w-full max-w-md rounded-full bg-white/[0.06]" />
            <div className="h-12 w-32 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-[300px] shrink-0 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl shimmer"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </aside>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl overflow-hidden border border-line bg-white/80"
                >
                  <div
                    className="aspect-[4/3] shimmer"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-2/3 rounded-full shimmer" />
                    <div className="h-3 w-1/2 rounded-full shimmer opacity-70" />
                    <div className="h-3 w-3/4 rounded-full shimmer opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
