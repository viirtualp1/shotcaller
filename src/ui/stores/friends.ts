import { defineStore } from 'pinia'
import { useIntervalFn } from '@vueuse/core'
import { LIVE_MATCH_INTERVAL } from '@/application/social/liveMatch'
import { computed, ref, shallowRef, watch } from 'vue'
import type {
  CoachCard,
  FriendEntry,
  FriendProfile,
  FriendRequestResult,
  FriendsService,
  OwnCard,
  Presence,
  PresenceStatus,
} from '@/application/social/friends'
import type { MatchRecord } from '@/domain/profile/Profile'
import { useAccountPhoto } from '../composables/useAccountPhoto'
import { useCloudStore } from './cloud'
import { useMatchStore } from './match'
import { useNotificationsStore } from './notifications'
import { useReplayStore } from './replay'

export type FriendsStatus = 'off' | 'loading' | 'ready' | 'error'

const byName = (a: FriendEntry, b: FriendEntry) => a.name.localeCompare(b.name)

/**
 * Friends and who of them is online. Starts with the app for a signed-in coach, so they show up online
 * for their friends even before opening the list.
 */
export const useFriendsStore = defineStore('friends', () => {
  let viewedMatches = new Map<string, Promise<MatchRecord | null>>()
  let service: FriendsService | null = null
  let presence: Presence | null = null
  let stops: (() => void)[] = []
  /** Requests as of the last refresh, to tell what is new; null before the first one. */
  let known: { incoming: ReadonlySet<string>; outgoing: ReadonlySet<string> } | null = null
  /** Bumped on every account change, so a connection that finishes late for an old account is dropped. */
  let generation = 0
  /** The Google picture last published for friends, so a list refresh does not send it again. */
  let publishedPhoto: string | null | undefined
  let publishing = false
  let publishedLive = false
  let liveWatched = false
  let publishedLiveKey: string | null = null

  const cloud = useCloudStore()
  const match = useMatchStore()
  const notifications = useNotificationsStore()
  const accountPhoto = useAccountPhoto()
  const replay = useReplayStore()

  const status = ref<FriendsStatus>('off')
  const card = shallowRef<OwnCard | null>(null)
  const entries = shallowRef<FriendEntry[]>([])
  const blocked = shallowRef<CoachCard[]>([])
  const online = shallowRef<ReadonlyMap<string, PresenceStatus>>(new Map())
  /** The friends panel shared by every screen. */
  const open = ref(false)
  /** The friend whose profile is open, and the profile once it has loaded. */
  const viewedId = ref<string | null>(null)
  const viewed = shallowRef<FriendProfile | null>(null)
  const viewLoading = ref(false)

  /** What this coach is doing, as their friends see it. */
  const ownStatus = computed<PresenceStatus>(() => ({
    activity: !match.view ? 'menu' : match.isDuel ? 'duel' : 'match',
    round: match.view?.round ?? null,
  }))

  const friends = computed(() =>
    entries.value
      .filter((e) => e.status === 'friend')
      .sort((a, b) => Number(isOnline(b.id)) - Number(isOnline(a.id)) || byName(a, b)),
  )

  const incoming = computed(() => entries.value.filter((e) => e.status === 'incoming').sort(byName))
  const outgoing = computed(() => entries.value.filter((e) => e.status === 'outgoing').sort(byName))
  const onlineCount = computed(() => friends.value.filter((f) => isOnline(f.id)).length)

  function isOnline(id: string) {
    return online.value.has(id)
  }

  function statusOf(id: string) {
    return online.value.get(id) ?? null
  }

  async function openProfile(id: string) {
    viewedId.value = id
    viewed.value = null
    viewLoading.value = true
    viewedMatches = new Map()

    const loaded = await service?.profile(id).catch(() => null)
    if (viewedId.value === id) {
      viewed.value = loaded ?? null
      viewLoading.value = false
    }
  }

  function closeProfile() {
    viewedId.value = null
    viewed.value = null
    viewLoading.value = false
    viewedMatches = new Map()
  }

  /** A match of the open profile in full. Played matches do not change, so each is fetched once. */
  function viewedMatch(matchId: string) {
    const id = viewedId.value
    if (!id || !service) {
      return Promise.resolve(null)
    }

    const matches = viewedMatches
    let loading = matches.get(matchId)

    if (!loading) {
      loading = service.match(id, matchId).catch(() => {
        matches.delete(matchId)

        return null
      })

      matches.set(matchId, loading)
    }

    return loading
  }

  function disconnect() {
    generation++

    for (const stop of stops) {
      stop()
    }

    stops = []
    service = null
    presence = null
    known = null
    notifications.clear()
    card.value = null
    entries.value = []
    blocked.value = []
    online.value = new Map()
    status.value = 'off'
    publishedPhoto = undefined
    publishedLive = false
    liveWatched = false
    publishedLiveKey = null
    publishing = false

    if (replay.liveFriend) {
      replay.close()
    }

    closeProfile()
  }

  async function publishLive() {
    const current = service
    if (!current || status.value !== 'ready' || publishing) {
      return
    }

    const key = match.view ? `${match.liveMatchId()}:${match.view.round}:${match.phase}` : null
    if (!key && !publishedLive) {
      return
    }

    publishing = true

    try {
      if (key && publishedLive && key === publishedLiveKey && !liveWatched) {
        const watched = await current.keepLiveMatch()
        if (service !== current) {
          return
        }

        liveWatched = watched === true

        if (watched !== null && !liveWatched) {
          return
        }
      }

      const snapshot = match.liveMatch()
      const watched = await current.publishLiveMatch(snapshot)

      if (service === current) {
        publishedLive = snapshot !== null
        publishedLiveKey = key
        liveWatched = watched
      }
    } catch {
      // Viewing a match must never interrupt the player's own game. Retry at the next interval.
    } finally {
      if (service === current) {
        publishing = false
      }
    }
  }

  function watchMatch(id: string) {
    const current = service
    if (!current || !friends.value.some((friend) => friend.id === id)) {
      return
    }

    replay.openLive(id, () => current.liveMatch(id))
    open.value = false
    closeProfile()
  }

  /** Friends see the Google picture only while this coach shows it. */
  function publishPhoto() {
    if (!service || status.value !== 'ready') {
      return
    }

    const url = accountPhoto.shown.value
    if (publishedPhoto === url) {
      return
    }

    publishedPhoto = url

    void service.setPhoto(url).catch(() => {
      publishedPhoto = undefined
    })
  }

  /** Announces requests that just arrived and requests of ours that were just accepted. */
  function announce(list: FriendEntry[]) {
    const ids = (status: FriendEntry['status']) =>
      new Set(list.filter((e) => e.status === status).map((e) => e.id))

    const incoming = ids('incoming')
    const outgoing = ids('outgoing')

    for (const entry of list) {
      if (entry.status === 'incoming' && !known?.incoming.has(entry.id)) {
        notifications.push(
          {
            kind: 'friendRequest',
            coach: entry,
          },
          `friendRequest:${entry.id}`,
        )
      }

      if (entry.status === 'friend' && known?.outgoing.has(entry.id)) {
        notifications.push(
          {
            kind: 'friendAccepted',
            coach: entry,
          },
          `friendAccepted:${entry.id}`,
        )
      }
    }

    for (const id of known?.incoming ?? []) {
      if (!incoming.has(id)) {
        notifications.dismissKey(`friendRequest:${id}`)
      }
    }

    known = {
      incoming,
      outgoing,
    }
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
        announce(list)
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

    const joined = service.presence(ownStatus.value)
    joined.onChange((next) => (online.value = next))
    presence = joined
    stops = [service.watch(() => void refresh()), () => joined.leave()]

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

  /* Friends see "in a match, round 5" and the like; only a real change is sent. */
  watch(
    () => `${ownStatus.value.activity}:${ownStatus.value.round}`,
    () => presence?.update(ownStatus.value),
  )

  /* A friend removed or blocked takes their open profile with them. */
  watch(friends, (list) => {
    if (viewedId.value && !list.some((f) => f.id === viewedId.value)) {
      closeProfile()
    }

    if (replay.liveFriend && !list.some((friend) => friend.id === replay.liveFriend)) {
      replay.close()
    }
  })

  watch([() => status.value, accountPhoto.shown], () => publishPhoto())
  watch([() => status.value, () => match.phase], () => void publishLive())
  useIntervalFn(() => void publishLive(), LIVE_MATCH_INTERVAL)

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
    viewedId,
    viewed,
    viewLoading,
    isOnline,
    statusOf,
    openProfile,
    closeProfile,
    viewedMatch,
    watchMatch,
    refresh,
    add,
    accept,
    decline,
    remove,
    block,
    unblock,
  }
})
