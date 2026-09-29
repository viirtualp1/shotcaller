import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { useCloudStore } from '../stores/cloud'

/**
 * The Google account's picture as the coach's own avatar: shown by default when there is one, until the coach
 * picks a hero instead. Friends see the same choice.
 */
export function useAccountPhoto() {
  const cloud = useCloudStore()
  const wanted = useLocalStorage(STORAGE_KEYS.accountPhoto, true)

  const available = computed(() => cloud.account?.photo ?? null)
  const shown = computed(() => (wanted.value ? available.value : null))

  return {
    available,
    shown,
    use: (on: boolean) => (wanted.value = on),
  }
}
