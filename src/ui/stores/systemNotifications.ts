import { until, useDocumentVisibility, useEventListener, useLocalStorage, useWindowFocus } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  consumeNotificationTarget,
  isNotificationTarget,
  type NotificationTarget,
} from '@/application/notificationTarget'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { useGameText } from '../composables/useGameText'
import { useNotificationText } from '../composables/useNotificationText'
import { useChatStore } from './chat'
import { useCloudStore } from './cloud'
import { useDuelStore } from './duel'
import { useFriendsStore } from './friends'
import { useNotificationsStore, type SocialNotification } from './notifications'

const supported = typeof globalThis.Notification !== 'undefined'
const ICON = `${import.meta.env.BASE_URL}pwa-192x192.png`
/** A game just opened by a tap waits this long for the account to sign back in before opening a chat. */
const SIGN_IN_WAIT_MS = 15_000

/**
 * The browser's own notifications for social news while the game is in the background: a message, a friend
 * request, a duel challenge. In front, the stack in the corner already says it. Off until the player allows it.
 */
export const useSystemNotificationsStore = defineStore('systemNotifications', () => {
  const shown = new Set<number>()

  const notifications = useNotificationsStore()
  const chat = useChatStore()
  const friends = useFriendsStore()
  const duel = useDuelStore()
  const cloud = useCloudStore()
  const text = useNotificationText()
  const { t } = useGameText()
  const visibility = useDocumentVisibility()
  const focused = useWindowFocus()

  const permission = ref<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  )

  const enabled = useLocalStorage(STORAGE_KEYS.systemNotifications, true)
  /** The player closed the offer to turn them on. */
  const promptDismissed = useLocalStorage(STORAGE_KEYS.systemNotificationsPrompt, false)
  const active = computed(() => enabled.value && permission.value === 'granted')

  /** Asks the browser; it only shows its question in answer to a click. */
  async function request() {
    if (!supported) {
      return
    }

    permission.value = await Notification.requestPermission()
    enabled.value = permission.value === 'granted'
    promptDismissed.value = true
  }

  function show(title: string, body: string, tag: string, target: NotificationTarget) {
    if (!active.value || (visibility.value === 'visible' && focused.value)) {
      return
    }

    try {
      const notification = new Notification(title, {
        body,
        tag,
        icon: ICON,
      })

      notification.onclick = () => {
        globalThis.focus()
        void openTarget(target)
        notification.close()
      }
    } catch {
      /* Mobile browsers only allow notifications through the service worker; its tap handler sends the target back. */
      void navigator.serviceWorker?.ready
        .then((registration) =>
          registration.showNotification(title, {
            body,
            tag,
            icon: ICON,
            data: target,
          }),
        )
        .catch(() => undefined)
    }
  }

  function targetOf({ notice }: SocialNotification): NotificationTarget {
    if (notice.kind === 'message') {
      return {
        kind: 'chat',
        friendId: notice.friendId,
      }
    }

    if (notice.kind === 'friendAccepted') {
      return {
        kind: 'chat',
        friendId: notice.coach.id,
      }
    }

    return notice.kind === 'friendRequest' || notice.kind === 'friendPlaying'
      ? { kind: 'friends' }
      : { kind: 'game' }
  }

  /** A game the tap has just opened signs back in first; the chat needs the account. */
  async function openTarget(target: NotificationTarget) {
    if (target.kind === 'friends') {
      friends.open = true
    } else if (target.kind === 'chat') {
      await until(() => cloud.signedIn)
        .toBe(true, { timeout: SIGN_IN_WAIT_MS })
        .catch(() => undefined)

      if (cloud.signedIn) {
        void chat.open(target.friendId)
      }
    }
  }

  watch(
    () => notifications.items,
    (items) => {
      for (const item of items) {
        if (shown.has(item.id)) {
          continue
        }

        shown.add(item.id)
        const coach = text.coachOf(item)
        const headline = text.headline(item)

        if (item.notice.kind === 'message') {
          show(`${coach?.name} · ${headline}`, item.notice.body, item.key, targetOf(item))
        } else {
          show(coach?.name ?? t('app.title'), headline, item.key, targetOf(item))
        }
      }

      /* Only ids still on screen are worth remembering. */
      for (const id of shown) {
        if (!items.some((item) => item.id === id)) {
          shown.delete(id)
        }
      }
    },
  )

  watch(
    () => duel.incoming?.duel.id,
    (id) => {
      const invite = duel.incoming
      if (id && invite) {
        show(
          t('duel.invitedTitle'),
          t('duel.invitedText', { name: text.nameOr(invite.opponent.name) }),
          `duel-invite:${id}`,
          { kind: 'game' },
        )
      }
    },
  )

  /* Taps the service worker handled: the game is already in front, and it opens what the tap was about. */
  if (navigator.serviceWorker) {
    useEventListener(navigator.serviceWorker, 'message', (event: MessageEvent) => {
      const data: unknown = event.data
      if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        data.type === 'notification-click' &&
        'target' in data &&
        isNotificationTarget(data.target)
      ) {
        event.ports?.[0]?.postMessage('notification-click-received')
        void openTarget(data.target)
      }
    })

    navigator.serviceWorker.startMessages()
  }

  if (globalThis.location) {
    const url = new URL(globalThis.location.href)
    const target = consumeNotificationTarget(url)

    if (url.href !== globalThis.location.href) {
      globalThis.history.replaceState(globalThis.history.state, '', url.href)
    }

    if (target) {
      void openTarget(target)
    }
  }

  return {
    supported,
    permission,
    enabled,
    active,
    promptDismissed,
    request,
  }
})
