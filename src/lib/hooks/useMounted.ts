import { useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

/**
 * True only after the component has mounted on the client.
 *
 * Exists for `createPortal(..., document.body)`: 'use client' components are
 * still rendered on the server, where `document` does not exist, so a portal
 * has to wait for mount.
 *
 * useSyncExternalStore rather than setState-in-an-effect, which the React
 * Compiler lint rejects for causing cascading renders. The server snapshot is
 * false and the client snapshot true, so SSR renders nothing and the client
 * mounts the portal after hydration — the same approach TiltCard uses for its
 * pointer query.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}
