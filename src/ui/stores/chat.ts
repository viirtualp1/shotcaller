import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  CONVERSATION_PAGE,
  ChatError,
  type ChatFailure,
  type ChatMessage,
  type ChatService,
} from '@/application/social/chat'
import { useCloudStore } from './cloud'
import { useFriendsStore } from './friends'
import { useNotificationsStore } from './notifications'

/** The server keeps this many messages per conversation; the screen never needs more. */
const KEPT_MESSAGES = 200
const messageKey = (friendId: string) => `message:${friendId}`

/** Conversations with friends. One is open at a time, inside the friends panel. */
export const useChatStore = defineStore('chat', () => {
  const cloud = useCloudStore()
  const friends = useFriendsStore()
  const unread = shallowRef<ReadonlyMap<string, number>>(new Map())
  /** The friend whose conversation is open. */
  const friendId = ref<string | null>(null)
  const messages = shallowRef<ChatMessage[]>([])
  const hasOlder = ref(false)
  const loading = ref(false)
  const sending = ref(false)
  const failure = ref<ChatFailure | null>(null)
  const notifications = useNotificationsStore()

  let service: ChatService | null = null
  let stop: (() => void) | null = null
  let userId: string | null = null
  let generation = 0

  const totalUnread = computed(() => [...unread.value.values()].reduce((sum, n) => sum + n, 0))
  const unreadFrom = (id: string) => unread.value.get(id) ?? 0

  function setUnread(id: string, count: number) {
    const next = new Map(unread.value)

    if (count > 0) {
      next.set(id, count)
    } else {
      next.delete(id)
    }

    unread.value = next
  }

  function append(message: ChatMessage) {
    if (messages.value.some((m) => m.id === message.id)) {
      return
    }

    messages.value = [...messages.value, message].slice(-KEPT_MESSAGES)
  }

  function onMessage(message: ChatMessage) {
    const mine = message.sender === userId
    const other = mine ? message.recipient : message.sender

    if (other === friendId.value) {
      append(message)

      if (!mine) {
        void service?.markRead(other).catch(() => undefined)
      }

      return
    }

    if (!mine) {
      setUnread(other, unreadFrom(other) + 1)

      /* Several messages from one friend make one notification that counts them. */
      const earlier = notifications.find(messageKey(other))?.notice
      notifications.push(
        {
          kind: 'message',
          friendId: other,
          body: message.body,
          count: (earlier?.kind === 'message' ? earlier.count : 0) + 1,
        },
        messageKey(other),
      )
    }
  }

  async function open(id: string) {
    friendId.value = id
    notifications.dismissKey(messageKey(id))
    messages.value = []
    hasOlder.value = false
    failure.value = null

    if (!service) {
      return
    }

    loading.value = true

    try {
      const page = await service.conversation(id)
      if (friendId.value !== id) {
        return
      }

      messages.value = page
      hasOlder.value = page.length === CONVERSATION_PAGE
      setUnread(id, 0)
      await service.markRead(id)
    } catch {
      failure.value = 'failed'
    } finally {
      loading.value = false
    }
  }

  function close() {
    friendId.value = null
    messages.value = []
    failure.value = null
  }

  async function loadOlder() {
    const id = friendId.value
    const oldest = messages.value[0]
    if (!service || !id || !oldest || loading.value) {
      return
    }

    loading.value = true

    try {
      const page = await service.conversation(id, oldest.id)
      if (friendId.value === id) {
        messages.value = [...page, ...messages.value]
        hasOlder.value = page.length === CONVERSATION_PAGE
      }
    } catch {
      failure.value = 'failed'
    } finally {
      loading.value = false
    }
  }

  /** Resolves true once the message is sent; the reason for a failure is left in `failure`. */
  async function send(body: string) {
    const id = friendId.value
    if (!service || !id || sending.value) {
      return false
    }

    sending.value = true
    failure.value = null

    try {
      append(await service.send(id, body))

      return true
    } catch (error) {
      failure.value = error instanceof ChatError ? error.reason : 'failed'

      /* Most likely they removed or blocked us; the friends list catches up. */
      if (failure.value === 'forbidden') {
        void friends.refresh()
      }

      return false
    } finally {
      sending.value = false
    }
  }

  function disconnect() {
    generation++
    stop?.()
    stop = null
    service = null
    userId = null
    unread.value = new Map()
    close()
  }

  async function connectAs(id: string) {
    const attempt = generation
    const cloudClient = await cloud.connect()
    if (attempt !== generation) {
      return
    }

    userId = id
    service = cloudClient.chat(id)
    stop = service.watch(onMessage)

    try {
      const counts = await service.unread()
      if (attempt === generation) {
        unread.value = counts
      }
    } catch {
      /* Unread badges are a nicety; the conversations still load when opened. */
    }
  }

  watch(
    () => (cloud.signedIn ? cloud.account?.id : null),
    (id) => {
      disconnect()

      if (id) {
        void connectAs(id)
      }
    },
    { immediate: true },
  )

  /* A friend who is gone (removed or blocked) takes the conversation and its badge with them. */
  watch(
    () => friends.friends.map((f) => f.id),
    (ids) => {
      if (friendId.value && !ids.includes(friendId.value)) {
        close()
      }

      if ([...unread.value.keys()].some((id) => !ids.includes(id))) {
        unread.value = new Map([...unread.value].filter(([id]) => ids.includes(id)))
      }
    },
  )

  return {
    friendId,
    messages,
    hasOlder,
    loading,
    sending,
    failure,
    totalUnread,
    unreadFrom,
    open,
    close,
    loadOlder,
    send,
  }
})
