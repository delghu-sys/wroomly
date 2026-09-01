import { PageShell, PageHeading, CardGrid, Bar } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell>
      <PageHeading wide />
      <div className="space-y-2.5 max-w-[65ch] mb-10">
        <Bar className="h-3.5 w-full" />
        <Bar className="h-3.5 w-11/12 opacity-80" />
        <Bar className="h-3.5 w-4/5 opacity-60" />
      </div>
      <CardGrid count={6} />
    </PageShell>
  )
}
