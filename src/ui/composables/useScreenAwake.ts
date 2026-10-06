import { useWakeLock } from '@vueuse/core'
import { watch } from 'vue'

/**
 * Keeps the screen on while `wanted` holds: a battle plays itself, and a phone left untouched would dim and lock in the
 * middle of it. The lock comes back each time the tab is shown again; where the browser refuses it, nothing changes.
 */
export function useScreenAwake(wanted: () => boolean) {
  const lock = useWakeLock()

  watch(
    wanted,
    (on) => {
      if (!lock.isSupported.value) {
        return
      }

      const change = on ? lock.request('screen') : lock.release()
      void change.catch(() => undefined)
    },
    { immediate: true },
  )
}
