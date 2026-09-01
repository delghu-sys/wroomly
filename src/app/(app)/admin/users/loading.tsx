import { PageShell, PageHeading, RowList } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-6xl">
      <PageHeading />
      <RowList count={6} />
    </PageShell>
  )
}
