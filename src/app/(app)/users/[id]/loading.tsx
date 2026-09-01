import { CardGrid, Bar } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12" aria-hidden>
      <div className="flex items-center gap-5 mb-10">
        <Bar className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-2.5">
          <Bar className="h-8 w-52 rounded-2xl" />
          <Bar className="h-3.5 w-36 opacity-70" />
        </div>
      </div>
      <Bar className="h-5 w-40 mb-5" />
      <CardGrid count={3} />
    </div>
  )
}
