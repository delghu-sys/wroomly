/**
 * Homepage skeleton. The hero is client-rendered and paints immediately, so
 * this stands in for the fetched "Newest listings" strip and the section
 * below it — the parts that wait on Supabase.
 */
export default function HomeLoading() {
  return (
    <div aria-hidden>
      <div className="min-h-[72vh] flex flex-col items-center justify-center px-6 gap-5">
        <div className="shimmer h-4 w-56 rounded-full" />
        <div className="shimmer h-16 w-full max-w-2xl rounded-3xl" />
        <div className="shimmer h-14 w-full max-w-xl rounded-full" />
      </div>

      <section className="bg-background pt-[3.25rem] pb-[3.5rem] overflow-hidden">
        <div className="flex items-baseline justify-between px-[1.375rem] min-[800px]:px-8 mb-[1.375rem]">
          <div className="shimmer h-3 w-32 rounded-full" />
          <div className="shimmer h-3 w-20 rounded-full opacity-60" />
        </div>
        <div className="flex gap-4 px-[1.375rem] min-[800px]:px-8 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-[230px] shrink-0 min-[800px]:flex-1 rounded-3xl overflow-hidden border border-line bg-surface"
            >
              <div className="shimmer aspect-[4/3]" style={{ animationDelay: `${i * 0.05}s` }} />
              <div className="p-4 space-y-2.5">
                <div className="shimmer h-4 w-2/3 rounded-full" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="shimmer h-3 w-1/2 rounded-full opacity-70" style={{ animationDelay: `${i * 0.05}s` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
