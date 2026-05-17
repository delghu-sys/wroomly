/**
 * Skeleton row matching the exact layout of ConversationListItem.
 * Pure CSS shimmer (already defined in globals.css) — no JS.
 */
export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl">
      <div className="w-11 h-11 rounded-full shimmer shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-28 rounded-full shimmer" />
          <div className="h-3 w-10 rounded-full shimmer" />
        </div>
        <div className="h-2.5 w-40 rounded-full shimmer opacity-70" />
        <div className="h-2.5 w-48 rounded-full shimmer opacity-50" />
      </div>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(6)].map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function MessageBubbleSkeleton({
  align = 'left',
  width = '60%',
}: {
  align?: 'left' | 'right'
  width?: string
}) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className="h-9 rounded-[1.25rem] shimmer"
        style={{ width, maxWidth: '70%' }}
      />
    </div>
  )
}
