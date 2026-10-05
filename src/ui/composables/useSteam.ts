import { watch } from 'vue'
import { connectSteam } from '@/application/steam'
import { earnedSteamAchievements } from '@/application/steamAchievements'
import { useCloudStore } from '../stores/cloud'
import { useProfileStore } from '../stores/profile'

/**
 * Steam in the desktop game: it signs the player in and unlocks every achievement the profile has earned, including
 * ones from before Steam. On the web, in Discord and without a Steam client it does nothing.
 */
export function useSteam() {
  const profile = useProfileStore()
  const cloud = useCloudStore()

  void connectSteam().then((steam) => {
    if (!steam) {
      return
    }

    let reported = ''

    watch(
      () => earnedSteamAchievements(profile.profile),
      (names) => {
        const key = names.join()

        if (key === reported) {
          return
        }

        reported = key
        void steam.unlock(names).catch((error: unknown) => console.warn('Steam achievements failed', error))
      },
      { immediate: true },
    )

    void cloud.signInWithSteam(steam).catch((error: unknown) => console.warn('Steam sign-in failed', error))
  })
}
