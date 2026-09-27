import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { LocalStorageProfileRepository } from '@/application/persistence/ProfileRepository'
import type { HeroId } from '@/content/ids'
import { PROFILE } from '@/content/profile'
import { randomIds } from '@/core/ids'
import type { Match } from '@/domain/match/Match'
import {
  avatarOf,
  createProfile,
  finishedMatch,
  recordMatch,
  type MatchRecord,
  type Profile,
} from '@/domain/profile/Profile'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { useHashPage } from '../composables/useHashPage'
import { useSettingsStore } from './settings'

/** The coach's lifetime record: rank, level, favourite heroes and recent matches. */
export const useProfileStore = defineStore('profile', () => {
  const repository = new LocalStorageProfileRepository()
  const settings = useSettingsStore()

  const page = useHashPage(
    (hash) => (/^#\/profile\/?$/.test(hash) ? true : null),
    () => '#/profile',
  )

  const profile = shallowRef<Profile>(repository.load() ?? createProfile(new Date().toISOString()))
  /** The match that just ended, for the post-game screen. */
  const lastRecord = shallowRef<MatchRecord | null>(null)

  const rank = computed(() => rankFor(profile.value.rating))
  const level = computed(() => levelFor(profile.value.xp))
  const avatar = computed(() => avatarOf(profile.value))

  function update(next: Profile) {
    profile.value = next
    repository.save(next)
  }

  /** Returns the new history entry, so the cloud sync can queue it. */
  function record(match: Match) {
    const finished = finishedMatch(match, settings.difficulty)
    if (!finished) {
      return null
    }

    const result = recordMatch(profile.value, finished, {
      id: randomIds(),
      playedAt: new Date().toISOString(),
    })

    lastRecord.value = result.record
    update(result.profile)

    return result.record
  }

  /** Takes a profile the cloud settled on; unlike the other actions it is not queued for sync. */
  function replace(next: Profile) {
    update(next)
  }

  /** A fresh profile, for signing out of an account. */
  function reset() {
    lastRecord.value = null
    update(createProfile(new Date().toISOString()))
  }

  function rename(name: string) {
    update({
      ...profile.value,
      name: name.trim().slice(0, PROFILE.nameMaxLength),
    })
  }

  function setAvatar(heroId: HeroId | null) {
    update({
      ...profile.value,
      avatar: heroId,
    })
  }

  return {
    profile,
    lastRecord,
    rank,
    level,
    avatar,
    isOpen: computed(() => page.state.value !== null),
    open: () => page.open(true),
    close: page.close,
    record,
    replace,
    reset,
    rename,
    setAvatar,
  }
})
