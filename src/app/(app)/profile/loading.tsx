import { PageShell, PageHeading, FormFields } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-2xl">
      <PageHeading />
      <FormFields count={6} />
    </PageShell>
  )
}
