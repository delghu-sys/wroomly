-- ─────────────────────────────────────────────────────────────────────────────
-- 010_conversations_rpc.sql
--
-- Replaces loadConversations' "fetch every message in every conversation"
-- query with a server-side function that returns one row per conversation,
-- with last-message + unread-count precomputed via lateral joins. Latency
-- drops from O(messages) to O(conversations).
--
-- security invoker → RLS on conversations / messages / users / listings still
-- applies, so the function only sees rows the caller could already see.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function get_my_conversations()
returns table (
  id                       uuid,
  supplier_id              uuid,
  consumer_id              uuid,
  other_id                 uuid,
  other_full_name          text,
  other_avatar_url         text,
  listing_id               uuid,
  listing_title            text,
  listing_thumbnail_path   text,
  last_message_content     text,
  last_message_sender_id   uuid,
  last_message_created_at  timestamptz,
  unread_count             bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.supplier_id,
    c.consumer_id,
    case when c.supplier_id = auth.uid() then c.consumer_id else c.supplier_id end as other_id,
    other.full_name        as other_full_name,
    other.avatar_url       as other_avatar_url,
    l.id                   as listing_id,
    l.title                as listing_title,
    (
      select li.storage_path
      from listing_images li
      where li.listing_id = l.id
      order by li.display_order asc
      limit 1
    )                      as listing_thumbnail_path,
    lm.content             as last_message_content,
    lm.sender_id           as last_message_sender_id,
    lm.created_at          as last_message_created_at,
    coalesce(uc.cnt, 0)    as unread_count
  from conversations c
  left join users other
    on other.id =
       case when c.supplier_id = auth.uid() then c.consumer_id else c.supplier_id end
  left join listings l on l.id = c.listing_id
  left join lateral (
    select m.content, m.sender_id, m.created_at
    from messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::bigint as cnt
    from messages m
    where m.conversation_id = c.id
      and m.is_read = false
      and m.sender_id <> auth.uid()
  ) uc on true
  where c.supplier_id = auth.uid() or c.consumer_id = auth.uid()
  order by lm.created_at desc nulls last, c.created_at desc;
$$;

grant execute on function get_my_conversations() to authenticated;
