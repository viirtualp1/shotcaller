import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { MODE_IDS, type ModeId } from '@/content/ids'
import { DEFAULT_MODE, TUTORIAL_MODE } from '@/content/modes'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { detectLocale, i18n, isLocale, type Locale } from '../i18n'

const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && value in DIFFICULTIES

const isMode = (value: unknown): value is ModeId => MODE_IDS.some((mode) => mode === value)

function tutorialDone() {
  try {
    return localStorage.getItem(STORAGE_KEYS.tutorialCompleted) === 'true'
  } catch {
    return false
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const storedLocale = useLocalStorage<string>(STORAGE_KEYS.locale, detectLocale())

  const locale = computed<Locale>({
    get: () => (isLocale(storedLocale.value) ? storedLocale.value : detectLocale()),
    set: (value) => (storedLocale.value = value),
  })

  const storedDifficulty = useLocalStorage<string>(STORAGE_KEYS.difficulty, 'standard')

  const difficulty = computed<Difficulty>({
    get: () => (isDifficulty(storedDifficulty.value) ? storedDifficulty.value : 'standard'),
    set: (value) => (storedDifficulty.value = value),
  })

  const planningSeconds = computed(() => DIFFICULTIES[difficulty.value].planningSeconds)

  /* A new coach starts on the tutorial's mode; after that, the mode picked last. */
  const firstVisit = !tutorialDone()
  const storedMode = useLocalStorage<string>(STORAGE_KEYS.mode, firstVisit ? TUTORIAL_MODE : DEFAULT_MODE)

  /** Lane orders are an experiment: off until the coach turns them on. */
  const laneOrders = useLocalStorage(STORAGE_KEYS.laneOrders, false)

  /** Experiments that change the rules of new matches against the computer. */
  const heroRotation = useLocalStorage(STORAGE_KEYS.heroRotation, false)
  const roundTwists = useLocalStorage(STORAGE_KEYS.roundTwists, false)

  /** Whether the next match starts with the tutorial; asked again each time a match is set up. */
  const tutorialWanted = ref(firstVisit)

  const mode = computed<ModeId>({
    get: () => (isMode(storedMode.value) ? storedMode.value : DEFAULT_MODE),
    set: (value) => (storedMode.value = value),
  })

  watch(
    locale,
    (value) => {
      i18n.global.locale.value = value
      document.documentElement.lang = value
    },
    { immediate: true },
  )

  return {
    locale,
    difficulty,
    planningSeconds,
    mode,
    laneOrders,
    heroRotation,
    roundTwists,
    tutorialWanted,
  }
})
