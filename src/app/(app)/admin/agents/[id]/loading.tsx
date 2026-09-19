import { PageShell, PageHeading, Bar, FormFields } from '@/components/skeletons/Skeletons'

export default function Loading() {
  return (
    <PageShell width="max-w-3xl">
      <Bar className="h-4 w-32 mb-6" />
      <Bar className="h-24 rounded-3xl mb-6" />
      <PageHeading />
      <FormFields count={8} />
    </PageShell>
  )
}
