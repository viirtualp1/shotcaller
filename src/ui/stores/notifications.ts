import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { DuelFailure } from '@/application/social/duels'
import type { CoachCard } from '@/application/social/friends'

interface PlayingFriend {
  readonly coach: CoachCard
  readonly duel: boolean
}

/** Everything social the player hears about: friends, messages and duels. */
export type SocialNotice =
  | { readonly kind: 'message'; readonly friendId: string; readonly body: string; readonly count: number }
  | { readonly kind: 'friendRequest'; readonly coach: CoachCard }
  | { readonly kind: 'friendAccepted'; readonly coach: CoachCard }
  | { readonly kind: 'duelDeclined' | 'duelExpired' | 'duelCancelled'; readonly name: string }
  | {
      readonly kind: 'duelEnded'
      readonly how: 'forfeit' | 'timeout' | 'disputed' | 'review' | 'abandoned'
      readonly won: boolean
    }
  | { readonly kind: 'duelFailed'; readonly reason: DuelFailure }
  | { readonly kind: 'badBoard' }
  /** A friend started a match or a duel, which can be watched live. */
  | ({ readonly kind: 'friendPlaying'; readonly others?: readonly PlayingFriend[] } & PlayingFriend)

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
  friendPlaying: 12000,
}

/** More at once would cover the screen; the oldest make way. */
const MAX_SHOWN = 4
const ACTIVITY_KEY = 'friendPlaying'
const ACTIVITY_COOLDOWN_MS = 60_000

export const useNotificationsStore = defineStore('notifications', () => {
  const items = shallowRef<SocialNotification[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let seq = 0
  let activityAfter = 0

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
    if (key.startsWith(`${ACTIVITY_KEY}:`)) {
      const item = find(ACTIVITY_KEY)
      if (item?.notice.kind !== 'friendPlaying') {
        return
      }

      const id = key.slice(ACTIVITY_KEY.length + 1)

      const remaining = [item.notice, ...(item.notice.others ?? [])].filter(
        (player) => player.coach.id !== id,
      )

      const first = remaining[0]
      if (!first) {
        dismiss(item.id)

        return
      }

      items.value = items.value.map((shown) =>
        shown.id === item.id
          ? {
              ...item,
              notice: {
                kind: 'friendPlaying',
                coach: first.coach,
                duel: first.duel,
                others: remaining.slice(1),
              },
            }
          : shown,
      )

      return
    }

    const item = find(key)
    if (item) {
      dismiss(item.id)
    }
  }

  function push(notice: SocialNotice, key = `${notice.kind}:${++seq}`) {
    if (notice.kind === 'friendPlaying') {
      key = ACTIVITY_KEY
      const existing = find(key)
      if (existing?.notice.kind === 'friendPlaying') {
        const players = [existing.notice, ...(existing.notice.others ?? [])].filter(
          (player) => player.coach.id !== notice.coach.id,
        )

        players.push({
          coach: notice.coach,
          duel: notice.duel,
        })

        const first = players[0]!

        items.value = items.value.map((shown) =>
          shown.id === existing.id
            ? {
                ...existing,
                notice: {
                  kind: 'friendPlaying',
                  coach: first.coach,
                  duel: first.duel,
                  others: players.slice(1),
                },
              }
            : shown,
        )

        return
      }

      if (Date.now() < activityAfter) {
        return
      }

      activityAfter = Date.now() + ACTIVITY_COOLDOWN_MS
    }

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
    activityAfter = 0
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
