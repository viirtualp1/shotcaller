import { HERO_IDS } from '@/content/ids'
import type { SocialNotification } from '../stores/notifications'
import { useFriendsStore } from '../stores/friends'
import { useGameText } from './useGameText'

/** The words of a social notification, shared by the in-game stack and the browser's own notifications. */
export function useNotificationText() {
  const friends = useFriendsStore()
  const { t } = useGameText()

  const nameOr = (name: string | undefined) => name || t('profile.defaultName')
  const heroOf = (avatar: string | null | undefined) => HERO_IDS.find((id) => id === avatar) ?? 'spearman'

  /** The coach a notification is about, for its avatar and name. */
  function coachOf({ notice }: SocialNotification) {
    if (notice.kind === 'friendPlaying' && notice.others?.length) {
      return null
    }

    if (notice.kind === 'message') {
      const friend = friends.friends.find((f) => f.id === notice.friendId)

      return {
        name: nameOr(friend?.name),
        hero: heroOf(friend?.avatar),
        photo: friend?.photo ?? null,
      }
    }

    if (
      notice.kind === 'friendRequest' ||
      notice.kind === 'friendAccepted' ||
      notice.kind === 'friendPlaying'
    ) {
      return {
        name: nameOr(notice.coach.name),
        hero: heroOf(notice.coach.avatar),
        photo: notice.coach.photo,
      }
    }

    return null
  }

  function headline({ notice }: SocialNotification) {
    switch (notice.kind) {
      case 'message':
        return notice.count > 1
          ? t('notifications.messages', { n: notice.count }, notice.count)
          : t('chatWindow.newMessage')
      case 'friendRequest':
        return t('notifications.friendRequest')
      case 'friendAccepted':
        return t('notifications.friendAccepted')
      case 'duelDeclined':
        return t('duel.declined', { name: nameOr(notice.name) })
      case 'duelExpired':
        return t('duel.expired', { name: nameOr(notice.name) })
      case 'duelCancelled':
        return t('duel.cancelled', { name: nameOr(notice.name) })
      case 'duelEnded':
        if (notice.how === 'abandoned' || notice.how === 'review') {
          return t(`duel.ended.${notice.how}`)
        }

        return notice.how === 'disputed'
          ? t('duel.ended.disputed')
          : t(`duel.ended.${notice.how}${notice.won ? 'Won' : 'Lost'}`)
      case 'duelFailed':
        return t(`duel.failures.${notice.reason}`)
      case 'badBoard':
        return t('duel.badBoard')
      case 'friendPlaying':
        if (notice.others?.length) {
          return t('notifications.friendsPlaying', { n: notice.others.length + 1 }, notice.others.length + 1)
        }

        return t(notice.duel ? 'notifications.friendInDuel' : 'notifications.friendInMatch')
    }
  }

  return {
    nameOr,
    coachOf,
    headline,
  }
}
