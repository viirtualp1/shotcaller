import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

/**
 * Steps an illustration to its next state in a loop while it is on screen. `period` is how long the current state
 * stays up: a fixed number of milliseconds, or a function asked again before every step for scenes whose states
 * last differently. A click on any of the illustration's controls calls `restart`, so the coach's own pick stays
 * up for a full period before the loop moves on.
 */
export function useAutoCycle(advance: () => void, period: number | (() => number), visible: Ref<boolean>) {
  const motion = usePreferredReducedMotion()
  const running = computed(() => visible.value && motion.value !== 'reduce')
  const delay = () => (typeof period === 'number' ? period : period())

  const { start, stop } = useTimeoutFn(
    () => {
      advance()
      restart()
    },
    delay,
    { immediate: false },
  )

  function restart() {
    stop()

    if (running.value) {
      start()
    }
  }

  watch(running, restart, { immediate: true })

  return { restart }
}
