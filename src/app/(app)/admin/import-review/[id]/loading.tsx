import { PageShell, PageHeading, FormFields, Bar } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-6xl" className="py-8">
      <PageHeading />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Bar className="h-5 w-32" />
          <Bar className="aspect-[4/3] rounded-3xl" />
        </div>
        <FormFields count={6} />
      </div>
    </PageShell>
  )
}
