import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import type {
  CoachCard,
  FriendEntry,
  FriendRequestResult,
  FriendsService,
  OwnCard,
} from '@/application/social/friends'
import { useCloudStore } from './cloud'

export type FriendsStatus = 'off' | 'loading' | 'ready' | 'error'

const byName = (a: FriendEntry, b: FriendEntry) => a.name.localeCompare(b.name)

/**
 * Friends and who of them is online. Starts with the app for a signed-in coach, so they show up online
 * for their friends even before opening the list.
 */
export const useFriendsStore = defineStore('friends', () => {
  const cloud = useCloudStore()
  const status = ref<FriendsStatus>('off')
  const card = shallowRef<OwnCard | null>(null)
  const entries = shallowRef<FriendEntry[]>([])
  const blocked = shallowRef<CoachCard[]>([])
  const online = shallowRef<ReadonlySet<string>>(new Set())
  /** The friends panel on the start screen. */
  const open = ref(false)

  let service: FriendsService | null = null
  let stops: (() => void)[] = []
  /** Bumped on every account change, so a connection that finishes late for an old account is dropped. */
  let generation = 0

  const isOnline = (id: string) => online.value.has(id)

  const friends = computed(() =>
    entries.value
      .filter((e) => e.status === 'friend')
      .sort((a, b) => Number(isOnline(b.id)) - Number(isOnline(a.id)) || byName(a, b)),
  )

  const incoming = computed(() => entries.value.filter((e) => e.status === 'incoming').sort(byName))
  const outgoing = computed(() => entries.value.filter((e) => e.status === 'outgoing').sort(byName))
  const onlineCount = computed(() => friends.value.filter((f) => isOnline(f.id)).length)

  function disconnect() {
    generation++

    for (const stop of stops) {
      stop()
    }

    stops = []
    service = null
    card.value = null
    entries.value = []
    blocked.value = []
    online.value = new Set()
    status.value = 'off'
  }

  async function refresh() {
    if (!service) {
      return
    }

    const current = service

    try {
      const [ownCard, list, blockedList] = await Promise.all([
        current.card(),
        current.list(),
        current.blocked(),
      ])

      if (service === current) {
        card.value = ownCard
        entries.value = list
        blocked.value = blockedList
        status.value = 'ready'
      }
    } catch {
      if (service === current) {
        status.value = 'error'
      }
    }
  }

  async function connectAs(userId: string) {
    const attempt = generation
    const cloudClient = await cloud.connect()
    if (attempt !== generation) {
      return
    }

    service = cloudClient.friends(userId)
    status.value = 'loading'

    stops = [service.watch(() => void refresh()), service.presence((ids) => (online.value = ids))]

    await refresh()
  }

  async function add(code: string): Promise<FriendRequestResult | 'error'> {
    if (!service) {
      return 'error'
    }

    try {
      const result = await service.request(code)
      await refresh()

      return result
    } catch {
      return 'error'
    }
  }

  async function act(run: (friends: FriendsService) => Promise<void>) {
    if (!service) {
      return
    }

    try {
      await run(service)
    } finally {
      await refresh()
    }
  }

  const accept = (id: string) => act((friends) => friends.respond(id, true))
  const decline = (id: string) => act((friends) => friends.respond(id, false))
  const remove = (id: string) => act((friends) => friends.remove(id))
  const block = (id: string) => act((friends) => friends.block(id))
  const unblock = (id: string) => act((friends) => friends.unblock(id))

  watch(
    () => (cloud.signedIn ? cloud.account?.id : null),
    (userId) => {
      disconnect()

      if (userId) {
        void connectAs(userId)
      }
    },
    { immediate: true },
  )

  return {
    status,
    card,
    friends,
    incoming,
    outgoing,
    blocked,
    onlineCount,
    open,
    isOnline,
    refresh,
    add,
    accept,
    decline,
    remove,
    block,
    unblock,
  }
})
