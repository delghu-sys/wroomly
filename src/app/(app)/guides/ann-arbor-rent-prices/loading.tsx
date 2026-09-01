import { PageShell, PageHeading, Bar } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-5xl">
      <PageHeading wide />
      <div className="space-y-2.5 max-w-[65ch] mb-10">
        <Bar className="h-3.5 w-full" />
        <Bar className="h-3.5 w-3/4 opacity-70" />
      </div>
      <div className="rounded-3xl border border-line bg-surface overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-line last:border-0">
            <Bar className="h-4 w-40" delay={i * 0.05} />
            <Bar className="h-4 w-20" delay={i * 0.05} />
          </div>
        ))}
      </div>
    </PageShell>
  )
}
