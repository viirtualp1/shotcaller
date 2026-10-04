import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationsStore } from '@/ui/stores/notifications'

const coach = {
  id: 'c1',
  name: 'Anna',
  avatar: null,
  photo: null,
  rating: 0,
}

const message = (count: number) => ({
  kind: 'message' as const,
  friendId: 'c1',
  body: `hi ${count}`,
  count,
})

describe('social notifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('merges notifications about the same thing', () => {
    const notifications = useNotificationsStore()
    notifications.push(message(1), 'message:c1')
    notifications.push(message(2), 'message:c1')

    expect(notifications.items).toHaveLength(1)
    expect(notifications.items[0]!.notice).toMatchObject({ count: 2 })
  })

  it('keeps the newest few and drops the oldest', () => {
    const notifications = useNotificationsStore()

    for (let i = 0; i < 6; i++) {
      notifications.push({
        kind: 'duelDeclined',
        name: `n${i}`,
      })
    }

    expect(notifications.items.map((item) => item.notice)).toEqual(
      ['n2', 'n3', 'n4', 'n5'].map((name) => ({
        kind: 'duelDeclined',
        name,
      })),
    )
  })

  it('goes away on its own, a friend request after a message', () => {
    const notifications = useNotificationsStore()
    notifications.push(message(1), 'message:c1')

    notifications.push(
      {
        kind: 'friendRequest',
        coach,
      },
      'friendRequest:c1',
    )

    vi.advanceTimersByTime(8000)
    expect(notifications.items.map((item) => item.key)).toEqual(['friendRequest:c1'])

    vi.advanceTimersByTime(8000)
    expect(notifications.items).toHaveLength(0)
  })

  it('a merged notification starts its time again', () => {
    const notifications = useNotificationsStore()
    notifications.push(message(1), 'message:c1')
    vi.advanceTimersByTime(5000)
    notifications.push(message(2), 'message:c1')
    vi.advanceTimersByTime(5000)

    expect(notifications.items).toHaveLength(1)
  })

  it('is taken back by key, as when a request is answered elsewhere', () => {
    const notifications = useNotificationsStore()

    notifications.push(
      {
        kind: 'friendRequest',
        coach,
      },
      'friendRequest:c1',
    )

    notifications.dismissKey('friendRequest:c1')

    expect(notifications.items).toHaveLength(0)
  })

  it('groups a hundred game starts into one card without replacing messages or restarting its lifetime', () => {
    const notifications = useNotificationsStore()
    notifications.push(message(1), 'message:c1')

    notifications.push(
      {
        kind: 'friendPlaying',
        coach,
        duel: false,
      },
      'friendPlaying:c1',
    )

    const id = notifications.find('friendPlaying')!.id
    vi.advanceTimersByTime(6000)

    for (let i = 2; i <= 100; i++) {
      notifications.push(
        {
          kind: 'friendPlaying',
          coach: {
            ...coach,
            id: `c${i}`,
          },
          duel: true,
        },
        `friendPlaying:c${i}`,
      )
    }

    expect(notifications.items).toHaveLength(2)
    expect(notifications.find('message:c1')).not.toBeNull()
    const activity = notifications.find('friendPlaying')!
    expect(activity.id).toBe(id)
    expect(activity.notice.kind === 'friendPlaying' && activity.notice.others).toHaveLength(99)
    vi.advanceTimersByTime(6000)
    expect(notifications.find('friendPlaying')).toBeNull()

    notifications.push({
      kind: 'friendPlaying',
      coach,
      duel: false,
    })

    expect(notifications.items).toHaveLength(0)
    vi.advanceTimersByTime(48000)

    notifications.push({
      kind: 'friendPlaying',
      coach,
      duel: false,
    })

    expect(notifications.items).toHaveLength(1)
  })

  it('removes a player who stops or becomes our opponent from the grouped card', () => {
    const notifications = useNotificationsStore()
    notifications.push({
      kind: 'friendPlaying',
      coach,
      duel: false,
    })

    notifications.push({
      kind: 'friendPlaying',
      coach: {
        ...coach,
        id: 'c2',
      },
      duel: true,
    })

    notifications.dismissKey('friendPlaying:c1')

    expect(notifications.find('friendPlaying')!.notice).toMatchObject({
      coach: { id: 'c2' },
      duel: true,
      others: [],
    })

    notifications.dismissKey('friendPlaying:c2')
    expect(notifications.items).toHaveLength(0)
  })
})
