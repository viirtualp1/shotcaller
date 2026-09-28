import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { DuelFailure } from '@/application/social/duels'
import type { CoachCard } from '@/application/social/friends'

/** Everything social the player hears about: friends, messages and duels. */
export type SocialNotice =
  | { readonly kind: 'message'; readonly friendId: string; readonly body: string; readonly count: number }
  | { readonly kind: 'friendRequest'; readonly coach: CoachCard }
  | { readonly kind: 'friendAccepted'; readonly coach: CoachCard }
  | { readonly kind: 'duelDeclined' | 'duelExpired' | 'duelCancelled'; readonly name: string }
  | { readonly kind: 'duelEnded'; readonly how: 'forfeit' | 'timeout' | 'disputed'; readonly won: boolean }
  | { readonly kind: 'duelFailed'; readonly reason: DuelFailure }
  | { readonly kind: 'badBoard' }

export interface SocialNotification {
  readonly id: number
  /** Notifications about the same thing share a key; a new one replaces the old. */
  readonly key: string
  readonly notice: SocialNotice
}

/** How long each kind stays; a friend request waits longer, since it asks for an answer. */
const LIFETIME_MS: Readonly<Record<SocialNotice['kind'], number>> = {
  message: 7000,
  friendRequest: 15000,
  friendAccepted: 7000,
  duelDeclined: 7000,
  duelExpired: 7000,
  duelCancelled: 7000,
  duelEnded: 9000,
  duelFailed: 7000,
  badBoard: 9000,
}

/** More at once would cover the screen; the oldest make way. */
const MAX_SHOWN = 4

export const useNotificationsStore = defineStore('notifications', () => {
  const items = shallowRef<SocialNotification[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let seq = 0

  function forget(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  function dismiss(id: number) {
    forget(id)
    items.value = items.value.filter((item) => item.id !== id)
  }

  const find = (key: string) => items.value.find((item) => item.key === key) ?? null

  function dismissKey(key: string) {
    const item = find(key)
    if (item) {
      dismiss(item.id)
    }
  }

  function push(notice: SocialNotice, key = `${notice.kind}:${++seq}`) {
    const replaced = find(key)
    if (replaced) {
      forget(replaced.id)
    }

    const item = {
      id: ++seq,
      key,
      notice,
    }

    const next = [...items.value.filter((shown) => shown.key !== key), item]
    for (const dropped of next.slice(0, -MAX_SHOWN)) {
      forget(dropped.id)
    }

    items.value = next.slice(-MAX_SHOWN)

    timers.set(
      item.id,
      setTimeout(() => dismiss(item.id), LIFETIME_MS[notice.kind]),
    )
  }

  function clear() {
    for (const id of timers.keys()) {
      forget(id)
    }

    items.value = []
  }

  return {
    items,
    find,
    push,
    dismiss,
    dismissKey,
    clear,
  }
})
