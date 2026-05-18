import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ConversationListItemData } from './ConversationListItem'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface RpcRow {
  id: string
  supplier_id: string
  consumer_id: string
  other_id: string | null
  other_full_name: string | null
  other_avatar_url: string | null
  listing_id: string | null
  listing_title: string | null
  listing_thumbnail_path: string | null
  last_message_content: string | null
  last_message_sender_id: string | null
  last_message_created_at: string | null
  unread_count: number | string // bigint can come back as a string
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
 *
 * Backed by the `get_my_conversations()` Postgres function (migration 010),
 * which returns one row per conversation with last-message + unread-count
 * precomputed via lateral joins. The previous PostgREST embed had to pull
 * every message in every conversation just to derive those two values.
 */
export async function loadConversations(
  userId: string
): Promise<ConversationListItemData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_my_conversations')
  if (error) {
    console.error('[loadConversations] rpc failed', error)
    return []
  }

  const rows = (data ?? []) as RpcRow[]

  return rows.map(r => {
    const data: ConversationListItemData = {
      id: r.id,
      otherName: r.other_full_name,
      otherAvatarUrl: r.other_avatar_url,
      otherInitials: initialsOf(r.other_full_name),
      listingId: r.listing_id,
      listingTitle: r.listing_title,
      listingThumbnail: imageUrl(r.listing_thumbnail_path),
      lastMessage: r.last_message_content
        ? {
            content: r.last_message_content,
            senderId: r.last_message_sender_id ?? '',
            createdAt: r.last_message_created_at ?? '',
          }
        : null,
      unread: Number(r.unread_count) || 0,
      currentUserId: userId,
    }
    return data
  })
}
