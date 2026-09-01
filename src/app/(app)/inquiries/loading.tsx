import { PageShell, PageHeading, RowList } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-4xl">
      <PageHeading />
      <RowList count={4} lines={3} />
    </PageShell>
  )
}
