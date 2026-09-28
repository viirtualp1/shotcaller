import { useDocumentVisibility, useLocalStorage, useWindowFocus } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { useGameText } from '../composables/useGameText'
import { useNotificationText } from '../composables/useNotificationText'
import { useChatStore } from './chat'
import { useDuelStore } from './duel'
import { useFriendsStore } from './friends'
import { useNotificationsStore, type SocialNotification } from './notifications'

const supported = typeof globalThis.Notification !== 'undefined'
const ICON = `${import.meta.env.BASE_URL}pwa-192x192.png`

/**
 * The browser's own notifications for social news while the game is in the background: a message, a friend
 * request, a duel challenge. In front, the stack in the corner already says it. Off until the player allows it.
 */
export const useSystemNotificationsStore = defineStore('systemNotifications', () => {
  const notifications = useNotificationsStore()
  const chat = useChatStore()
  const friends = useFriendsStore()
  const duel = useDuelStore()
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
  const shown = new Set<number>()

  /** Asks the browser; it only shows its question in answer to a click. */
  async function request() {
    if (!supported) {
      return
    }

    permission.value = await Notification.requestPermission()
    enabled.value = permission.value === 'granted'
    promptDismissed.value = true
  }

  function show(title: string, body: string, tag: string, onClick?: () => void) {
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
        onClick?.()
        notification.close()
      }
    } catch {
      /* Mobile browsers only allow notifications through the service worker; a tap there opens the game. */
      void navigator.serviceWorker?.ready
        .then((registration) =>
          registration.showNotification(title, {
            body,
            tag,
            icon: ICON,
          }),
        )
        .catch(() => undefined)
    }
  }

  function act({ notice }: SocialNotification) {
    if (notice.kind === 'message') {
      void chat.open(notice.friendId)
    } else if (notice.kind === 'friendAccepted') {
      void chat.open(notice.coach.id)
    } else if (notice.kind === 'friendRequest') {
      friends.open = true
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
          show(`${coach?.name} · ${headline}`, item.notice.body, item.key, () => act(item))
        } else {
          show(coach?.name ?? t('app.title'), headline, item.key, () => act(item))
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
        )
      }
    },
  )

  return {
    supported,
    permission,
    enabled,
    active,
    promptDismissed,
    request,
  }
})
