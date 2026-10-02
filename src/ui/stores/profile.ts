import { defineStore } from 'pinia'
import { useIntervalFn, useNow } from '@vueuse/core'
import { computed, shallowRef } from 'vue'
import { LocalStorageProfileRepository } from '@/application/persistence/ProfileRepository'
import type { HeroId } from '@/content/ids'
import { PROFILE } from '@/content/profile'
import { TRIALS } from '@/content/career'
import { careerWeek, weeklyContracts, weeklyProgress, type advanceCareer } from '@/domain/profile/career'
import { randomIds } from '@/core/ids'
import type { Match } from '@/domain/match/Match'
import {
  avatarOf,
  createProfile,
  finishedMatch,
  recordMatch,
  type DuelInfo,
  type MatchRecord,
  type Profile,
} from '@/domain/profile/Profile'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { usePage } from '../composables/usePage'
import { useSettingsStore } from './settings'

/** The coach's lifetime record: rank, level, favourite heroes and recent matches. */
export const useProfileStore = defineStore('profile', () => {
  const repository = new LocalStorageProfileRepository()
  const settings = useSettingsStore()

  const page = usePage<'profile' | 'career'>(
    (path) => {
      if (/^\/profile\/?$/.test(path)) {
        return 'profile'
      }

      return /^\/career\/?$/.test(path) ? 'career' : null
    },
    (section) => `/${section}`,
  )

  const profile = shallowRef<Profile>(repository.load() ?? createProfile(new Date().toISOString()))
  /** The match that just ended, for the post-game screen. */
  const lastRecord = shallowRef<MatchRecord | null>(null)
  const lastProgress = shallowRef<ReturnType<typeof advanceCareer> | null>(null)
  const now = useNow({ scheduler: (tick) => useIntervalFn(tick, 60_000) })
  const week = computed(() => careerWeek(now.value))

  const rank = computed(() => rankFor(profile.value.rating))
  const level = computed(() => levelFor(profile.value.xp))
  const avatar = computed(() => avatarOf(profile.value))
  const nextTrial = computed(() => TRIALS.find((trial) => trial.level > level.value.level) ?? null)

  const contracts = computed(() => {
    const progress = weeklyProgress(profile.value.career, week.value)

    return weeklyContracts(week.value).map((contract) => ({
      ...contract,
      progress: Math.min(contract.target, progress.progress[contract.id]),
      completed: Boolean(progress.completed[contract.id]),
    }))
  })

  function update(next: Profile) {
    profile.value = next
    repository.save(next)
  }

  /**
   * Returns the new history entry, so the cloud sync can queue it. A duel is recorded under its own id,
   * so settling it again, here or on another device, changes nothing.
   */
  function record(match: Match, duel: (DuelInfo & { readonly id: string }) | null = null) {
    const finished = finishedMatch(
      match,
      settings.difficulty,
      duel && {
        opponentName: duel.opponentName,
        ...(duel.opponentRating === undefined ? {} : { opponentRating: duel.opponentRating }),
      },
    )

    if (!finished) {
      return null
    }

    const result = recordMatch(profile.value, finished, {
      id: duel?.id ?? randomIds(),
      playedAt: new Date().toISOString(),
    })

    lastRecord.value = result.record

    if (result.duplicate) {
      return null
    }

    lastProgress.value = result.progress ?? null

    update(result.profile)

    return result.record
  }

  /** A new match has no result yet; the post-game screen must not show the previous one. */
  function forgetLast() {
    lastRecord.value = null
    lastProgress.value = null
  }

  /** Takes a profile the cloud settled on; unlike the other actions it is not queued for sync. */
  function replace(next: Profile) {
    update(next)
  }

  /** A fresh profile, for signing out of an account. */
  function reset() {
    forgetLast()
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
    lastProgress,
    rank,
    level,
    avatar,
    nextTrial,
    week,
    contracts,
    isOpen: computed(() => page.state.value !== null),
    isCareer: computed(() => page.state.value === 'career'),
    open: () => page.open('profile'),
    openCareer: () => page.open('career'),
    close: page.close,
    record,
    forgetLast,
    replace,
    reset,
    rename,
    setAvatar,
  }
})
