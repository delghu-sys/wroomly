import { Bar } from '@/components/skeletons/Skeletons'

/** Mirrors the listing detail: gallery, then content + sticky booking card. */
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12" aria-hidden>
      <div className="shimmer aspect-[16/9] rounded-3xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <Bar className="h-9 w-3/4 rounded-2xl" />
            <Bar className="h-4 w-1/2 opacity-70" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bar key={i} className="h-20 rounded-2xl" delay={i * 0.05} />
            ))}
          </div>
          <div className="space-y-2.5 max-w-[65ch] pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bar key={i} className={`h-3.5 ${i === 4 ? 'w-2/3' : 'w-full'}`} delay={i * 0.03} />
            ))}
          </div>
          <Bar className="h-64 rounded-3xl" />
        </div>
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 rounded-3xl border border-line bg-surface p-6 space-y-4">
            <Bar className="h-12 w-40 rounded-2xl" />
            <Bar className="h-3.5 w-28 opacity-70" />
            <Bar className="h-16 rounded-2xl" />
            <Bar className="h-11 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
