import { PageShell, PageHeading, RowList } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-3xl">
      <PageHeading />
      <RowList count={3} />
    </PageShell>
  )
}
