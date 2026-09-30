import { defineStore } from 'pinia'
import { useDocumentVisibility } from '@vueuse/core'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
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
import { useModalsStore } from './modals'

/** The server keeps this many messages per conversation; the screen never needs more. */
const KEPT_MESSAGES = 200
const messageKey = (friendId: string) => `message:${friendId}`

/** Conversations with friends. One is open at a time, inside the friends panel. */
export const useChatStore = defineStore('chat', () => {
  const cloud = useCloudStore()
  const friends = useFriendsStore()
  const modals = useModalsStore()
  const documentVisibility = useDocumentVisibility()
  const minimized = ref(false)
  const atEnd = ref(true)
  const drafts = reactive<Record<string, string>>({})

  const windowOpen = computed(
    () => cloud.signedIn && (friends.open || friendId.value !== null) && !minimized.value && !modals.anyOpen,
  )

  const reading = computed(
    () => windowOpen.value && !loading.value && atEnd.value && documentVisibility.value === 'visible',
  )

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
  let conversationGeneration = 0
  let pendingConnection: Promise<void> | null = null
  const changedUnread = new Set<string>()

  const totalUnread = computed(() => [...unread.value.values()].reduce((sum, n) => sum + n, 0))
  const unreadFrom = (id: string) => unread.value.get(id) ?? 0

  function setUnread(id: string, count: number) {
    changedUnread.add(id)
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

      if (!mine && reading.value) {
        void service?.markRead(other).catch(() => undefined)

        return
      }

      if (mine) {
        return
      }
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

  async function acknowledge(id: string) {
    if (!service || !reading.value || friendId.value !== id) {
      return
    }

    setUnread(id, 0)
    notifications.dismissKey(messageKey(id))
    await service.markRead(id).catch(() => undefined)
  }

  async function open(id: string, reload = false) {
    if (friendId.value === id && !reload) {
      minimized.value = false
      friends.open = true
      void acknowledge(id)

      return
    }

    const attempt = ++conversationGeneration
    const connection = service
    loading.value = true
    friendId.value = id
    minimized.value = false
    friends.open = true
    atEnd.value = true
    messages.value = []
    hasOlder.value = false
    failure.value = null

    if (!connection) {
      const accountId = cloud.signedIn ? cloud.account?.id : null
      if (accountId) {
        void connectAs(accountId).catch(() => {
          if (attempt === conversationGeneration) {
            loading.value = false
            failure.value = 'failed'
          }
        })
      } else {
        loading.value = false
      }

      return
    }

    try {
      const page = await connection.conversation(id)
      if (attempt !== conversationGeneration) {
        return
      }

      /* Realtime may deliver a message while the first page is still loading. */
      messages.value = [...new Map([...page, ...messages.value].map((m) => [m.id, m])).values()].sort(
        (a, b) => a.id - b.id,
      )

      hasOlder.value = page.length === CONVERSATION_PAGE
      await acknowledge(id)
    } catch {
      if (attempt === conversationGeneration) {
        failure.value = 'failed'
      }
    } finally {
      if (attempt === conversationGeneration) {
        loading.value = false
      }
    }
  }

  function close() {
    conversationGeneration++
    friendId.value = null
    messages.value = []
    failure.value = null
    loading.value = false
    hasOlder.value = false
  }

  function minimize() {
    minimized.value = true
  }

  function toggleWindow() {
    if (windowOpen.value) {
      minimize()
    } else {
      minimized.value = false
      friends.open = true
    }
  }

  watch(
    reading,
    (active) => {
      if (active && friendId.value) {
        void acknowledge(friendId.value)
      }
    },
    { flush: 'sync' },
  )

  async function loadOlder() {
    const id = friendId.value
    const oldest = messages.value[0]
    const attempt = conversationGeneration
    if (!service || !id || !oldest || loading.value) {
      return
    }

    loading.value = true

    try {
      const page = await service.conversation(id, oldest.id)
      if (attempt === conversationGeneration) {
        messages.value = [...page, ...messages.value]
        hasOlder.value = page.length === CONVERSATION_PAGE
      }
    } catch {
      if (attempt === conversationGeneration) {
        failure.value = 'failed'
      }
    } finally {
      if (attempt === conversationGeneration) {
        loading.value = false
      }
    }
  }

  /** Resolves true once the message is sent; the reason for a failure is left in `failure`. */
  async function send(body: string) {
    const id = friendId.value
    if (!service || !id || sending.value) {
      return false
    }

    const attempt = conversationGeneration
    const connectionGeneration = generation
    const connection = service
    sending.value = true
    failure.value = null

    try {
      const message = await connection.send(id, body)
      if (attempt === conversationGeneration && connectionGeneration === generation) {
        append(message)
      }

      return true
    } catch (error) {
      const reason = error instanceof ChatError ? error.reason : 'failed'
      if (attempt === conversationGeneration && connectionGeneration === generation) {
        failure.value = reason
      }

      /* Most likely they removed or blocked us; the friends list catches up. */
      if (reason === 'forbidden' && connectionGeneration === generation) {
        void friends.refresh()
      }

      return false
    } finally {
      if (connectionGeneration === generation) {
        sending.value = false
      }
    }
  }

  function disconnect() {
    generation++
    pendingConnection = null
    changedUnread.clear()
    stop?.()
    stop = null
    service = null
    userId = null
    unread.value = new Map()
    sending.value = false
    minimized.value = false

    for (const id of Object.keys(drafts)) {
      delete drafts[id]
    }

    close()
  }

  function connectAs(id: string): Promise<void> {
    if (pendingConnection) {
      return pendingConnection
    }

    const attempt = generation
    pendingConnection = connectTo(id).finally(() => {
      if (attempt === generation) {
        pendingConnection = null
      }
    })

    return pendingConnection
  }

  async function connectTo(id: string) {
    const attempt = generation
    const cloudClient = await cloud.connect()
    if (attempt !== generation) {
      return
    }

    userId = id
    service = cloudClient.chat(id)

    stop = service.watch((message) => {
      if (attempt === generation) {
        onMessage(message)
      }
    })

    if (friendId.value) {
      void open(friendId.value, true)
    }

    try {
      const counts = await service.unread()
      if (attempt === generation) {
        unread.value = new Map([...counts].filter(([id]) => !changedUnread.has(id)).concat([...unread.value]))
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
        const attempt = generation
        void connectAs(id).catch(() => {
          if (attempt === generation) {
            failure.value = 'failed'
            loading.value = false
          }
        })
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

      for (const id of Object.keys(drafts)) {
        if (!ids.includes(id)) {
          delete drafts[id]
        }
      }

      if ([...unread.value.keys()].some((id) => !ids.includes(id))) {
        unread.value = new Map([...unread.value].filter(([id]) => ids.includes(id)))
      }
    },
  )

  return {
    friendId,
    minimized,
    windowOpen,
    atEnd,
    drafts,
    minimize,
    toggleWindow,
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
