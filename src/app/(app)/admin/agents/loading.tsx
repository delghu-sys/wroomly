import { PageShell, PageHeading, StatCards, RowList } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-6xl">
      <PageHeading />
      <StatCards count={5} />
      <RowList count={6} />
    </PageShell>
  )
}
