import { useFriendsStore } from '../stores/friends'
import { useGameText } from './useGameText'

/** "Online", "in a match · round 5", "in a duel · round 2" or "offline", as friends see each other. */
export function useFriendStatus() {
  const friends = useFriendsStore()
  const { t } = useGameText()

  return (id: string) => {
    const status = friends.statusOf(id)

    if (!status) {
      return t('friends.offline')
    }

    if (status.round !== null && status.activity !== 'menu') {
      return t(status.activity === 'duel' ? 'friends.inDuel' : 'friends.inMatch', { round: status.round })
    }

    return t('friends.online')
  }
}
