import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Message } from '@/types/database'
import type { ConversationListItemData } from './ConversationListItem'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface ConvoRow {
  id: string
  supplier_id: string
  consumer_id: string
  created_at: string
  listings: {
    id: string
    title: string
    type: string
    listing_images: { storage_path: string; display_order: number }[] | null
  } | null
  supplier: { id: string; full_name: string | null; avatar_url: string | null } | null
  consumer: { id: string; full_name: string | null; avatar_url: string | null } | null
  messages: Message[]
}

function imageUrl(path: string | null | undefined): string | null {
  if (!path || !SUPA_URL) return null
  return `${SUPA_URL}/storage/v1/object/public/listing-images/${path}`
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Fetch the current user's conversations shaped for ConversationList.
 * Returns null if the user isn't authenticated.
 */
export async function loadConversations(
  userId: string
): Promise<ConversationListItemData[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conversations')
    .select(`
      *,
      listings(id, title, type, listing_images(storage_path, display_order)),
      supplier:supplier_id(id, full_name, avatar_url),
      consumer:consumer_id(id, full_name, avatar_url),
      messages(id, content, created_at, sender_id, is_read)
    `)
    .or(`supplier_id.eq.${userId},consumer_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as ConvoRow[]

  return rows
    .map(c => {
      const msgs = c.messages ?? []
      const lastMsg = msgs.length
        ? [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
        : null
      const unread = msgs.filter(m => !m.is_read && m.sender_id !== userId).length

      const isSupplier = c.supplier_id === userId
      const other = isSupplier ? c.consumer : c.supplier
      const listing = c.listings
      const firstImage = listing?.listing_images
        ?.slice()
        .sort((a, b) => a.display_order - b.display_order)
        .at(0)

      const data: ConversationListItemData = {
        id: c.id,
        otherName: other?.full_name ?? null,
        otherAvatarUrl: other?.avatar_url ?? null,
        otherInitials: initialsOf(other?.full_name),
        listingId: listing?.id ?? null,
        listingTitle: listing?.title ?? null,
        listingThumbnail: imageUrl(firstImage?.storage_path),
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              senderId: lastMsg.sender_id,
              createdAt: lastMsg.created_at,
            }
          : null,
        unread,
        currentUserId: userId,
      }
      return data
    })
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? ''
      const bt = b.lastMessage?.createdAt ?? ''
      return bt.localeCompare(at)
    })
}
