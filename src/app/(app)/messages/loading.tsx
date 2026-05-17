import { ConversationListSkeleton } from '@/components/messages/ConversationRowSkeleton'

export default function MessagesLoading() {
  return (
    <div className="h-[calc(100dvh-4rem)] w-full bg-[oklch(0.985_0.006_85)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-full flex">
        <aside className="flex flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-line bg-white/60 backdrop-blur-xl">
          <div className="px-4 sm:px-5 pt-6 pb-4 shrink-0">
            <div className="h-9 w-40 rounded-2xl shimmer mb-4" />
            <div className="h-11 w-full rounded-2xl shimmer" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 pb-4">
            <ConversationListSkeleton />
          </div>
        </aside>
        <main className="hidden lg:flex flex-col flex-1 min-w-0 relative items-center justify-center">
          <div className="w-24 h-24 rounded-3xl shimmer" />
        </main>
      </div>
    </div>
  )
}
