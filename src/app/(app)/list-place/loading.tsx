export default function Loading() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-6 py-12" aria-hidden>
      <div className="max-w-lg w-full text-center mx-auto">
        <div className="shimmer inline-block w-16 h-16 rounded-2xl" />
        <div className="shimmer h-9 w-64 rounded-2xl mx-auto mt-6" />
        <div className="shimmer h-3.5 w-80 max-w-full rounded-full mx-auto mt-4 opacity-70" />
        <div className="shimmer h-3.5 w-56 rounded-full mx-auto mt-2 opacity-50" />
        <div className="shimmer h-11 w-44 rounded-full mx-auto mt-8" />
      </div>
    </div>
  )
}
