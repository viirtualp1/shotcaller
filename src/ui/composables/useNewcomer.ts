import { computed } from 'vue'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useProfileStore } from '../stores/profile'

/**
 * A coach who has never finished a match and has none to carry on. The start screen shows them the pitch and the
 * show fight; everyone else gets straight to their game.
 */
export function useNewcomer() {
  const store = useMatchStore()
  const duel = useDuelStore()
  const profile = useProfileStore()

  return computed(() => profile.profile.recent.length === 0 && !store.saved && !duel.resumable)
}
