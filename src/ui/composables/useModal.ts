import { onScopeDispose, toValue, watchEffect, type MaybeRefOrGetter } from 'vue'
import { useModalsStore } from '../stores/modals'

/** Registers a dialog as open while `open` is true; every dialog calls it with its own open state. */
export function useModal(open: MaybeRefOrGetter<boolean>) {
  const modals = useModalsStore()
  const id = Symbol('modal')

  watchEffect(() => {
    if (toValue(open)) {
      modals.open.add(id)
    } else {
      modals.open.delete(id)
    }
  })

  onScopeDispose(() => modals.open.delete(id))
}
