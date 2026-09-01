import { PageShell, PageHeading, FormFields } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-3xl">
      <PageHeading />
      <FormFields count={7} />
    </PageShell>
  )
}
