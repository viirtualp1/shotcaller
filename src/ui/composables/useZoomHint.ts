import { useDocumentVisibility, useMediaQuery, useTimeoutFn } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useMatchStore } from '../stores/match'
import { usePauseStore } from '../stores/pause'
import { useProfileStore } from '../stores/profile'
import { useModalsStore } from '../stores/modals'

/** A shared account flag covers the tour and the first match on touch screens. */
export const useZoomHint = defineStore('zoomHint', () => {
  const match = useMatchStore()
  const pause = usePauseStore()
  const profile = useProfileStore()
  const modals = useModalsStore()
  const touch = useMediaQuery('(any-pointer: coarse)')
  const visibility = useDocumentVisibility()
  const open = ref(false)
  const active = ref(false)

  const eligible = computed(
    () =>
      active.value &&
      touch.value &&
      visibility.value === 'visible' &&
      match.isPlanning &&
      !pause.paused &&
      modals.open.size === 0 &&
      !profile.profile.zoomHintSeen,
  )

  function close() {
    open.value = false
    pause.set('zoomHint', false)
  }

  function show() {
    if (!touch.value || profile.profile.zoomHintSeen) {
      return false
    }

    open.value = true
    pause.set('zoomHint', true)
    profile.markZoomHintSeen()

    return true
  }

  function setActive(value: boolean) {
    active.value = value

    if (!value) {
      close()
    }
  }

  const delay = useTimeoutFn(
    () => {
      if (!eligible.value) {
        return
      }

      show()
    },
    2400,
    { immediate: false },
  )

  watch(
    eligible,
    (ready) => {
      delay.stop()

      if (ready) {
        delay.start()
      }
    },
    { immediate: true },
  )

  watch(() => profile.profile.createdAt, close)
  onScopeDispose(close)

  return {
    open,
    close,
    show,
    setActive,
  }
})
