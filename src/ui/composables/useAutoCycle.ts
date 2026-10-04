import { useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

/**
 * Steps an illustration to its next state every few seconds, in a loop, while it is on screen. A click on any of its
 * controls calls `restart`, so the coach's own pick stays up for a full period before the loop moves on.
 */
export function useAutoCycle(advance: () => void, period: number, visible: Ref<boolean>) {
  const motion = usePreferredReducedMotion()
  const running = computed(() => visible.value && motion.value !== 'reduce')

  const { pause, resume } = useIntervalFn(advance, period, { immediate: false })

  function restart() {
    pause()

    if (running.value) {
      resume()
    }
  }

  watch(running, restart, { immediate: true })

  return { restart }
}
