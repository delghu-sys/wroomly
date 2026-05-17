import type { ReactNode } from 'react'
import { ConversationList } from './ConversationList'
import type { ConversationListItemData } from './ConversationListItem'

interface MessagesShellProps {
  conversations: ConversationListItemData[]
  activeId?: string
  /** Whether the list panel should be hidden on mobile (because a thread is open). */
  mobileListHidden?: boolean
  /** Right panel content — thread or empty state. */
  right: ReactNode
}

/**
 * Two-panel messaging shell. Renders the same conversation list everywhere
 * with a `right` slot for the open thread or empty state.
 *
 * Desktop: list (left) + right slot.
 * Mobile: only one panel shown at a time (controlled by `mobileListHidden`).
 */
export function MessagesShell({
  conversations,
  activeId,
  mobileListHidden,
  right,
}: MessagesShellProps) {
  return (
    <div className="h-[calc(100dvh-4rem)] w-full bg-[oklch(0.985_0.006_85)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-full flex">
        {/* Left — conversation list */}
        <aside
          className={`
            ${mobileListHidden ? 'hidden lg:flex' : 'flex'}
            flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0
            border-r border-line bg-white/60 backdrop-blur-xl
          `}
        >
          <ConversationList conversations={conversations} activeId={activeId} />
        </aside>

        {/* Right — thread or empty state */}
        <main
          className={`
            ${mobileListHidden ? 'flex' : 'hidden lg:flex'}
            flex-col flex-1 min-w-0 relative
          `}
        >
          {right}
        </main>
      </div>
    </div>
  )
}
