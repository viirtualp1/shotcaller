import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { detectLocale, i18n, isLocale, type Locale } from '../i18n'

const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && value in DIFFICULTIES

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

  watch(
    locale,
    (value) => {
      i18n.global.locale.value = value
      document.documentElement.lang = value
      document.title = i18n.global.t('app.title')
    },
    { immediate: true },
  )

  return { locale, difficulty, planningSeconds }
})
