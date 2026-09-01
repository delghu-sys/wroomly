import { PageShell, PageHeading, StatCards, RowList } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-3xl">
      <PageHeading />
      <div className="h-24 rounded-3xl shimmer mb-6" />
      <StatCards />
      <RowList count={3} />
    </PageShell>
  )
}
