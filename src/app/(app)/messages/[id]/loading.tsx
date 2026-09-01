import { ConversationListSkeleton } from '@/components/messages/ConversationRowSkeleton'

/**
 * Same shell as /messages/loading so moving between threads doesn't shift
 * the layout — only the right pane differs, showing bubble placeholders
 * instead of the empty-thread mark.
 */
export default function ThreadLoading() {
  return (
    <div className="h-[calc(100dvh-4rem)] w-full bg-[oklch(0.985_0.006_85)] overflow-hidden" aria-hidden>
      <div className="max-w-[1600px] mx-auto h-full flex">
        <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] shrink-0 border-r border-line bg-white/60 backdrop-blur-xl">
          <div className="px-4 sm:px-5 pt-6 pb-4 shrink-0">
            <div className="h-9 w-40 rounded-2xl shimmer mb-4" />
            <div className="h-11 w-full rounded-2xl shimmer" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 pb-4">
            <ConversationListSkeleton />
          </div>
        </aside>

        <main className="flex flex-col flex-1 min-w-0">
          <header className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-line bg-white/85 backdrop-blur-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full shimmer shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded-full shimmer" />
              <div className="h-3 w-20 rounded-full shimmer opacity-60" />
            </div>
          </header>

          <div className="flex-1 min-h-0 p-4 sm:p-6 space-y-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="shimmer rounded-2xl"
                  style={{
                    width: `${['58%', '42%', '66%', '38%', '50%'][i]}`,
                    height: i % 2 ? 44 : 60,
                    animationDelay: `${i * 0.06}s`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="shrink-0 p-4 border-t border-line">
            <div className="h-12 w-full rounded-full shimmer" />
          </div>
        </main>
      </div>
    </div>
  )
}
