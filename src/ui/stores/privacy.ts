import { useDocumentVisibility, useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { PRIVACY_VERSION, telemetryOf, type PrivacyChoices } from '@/application/cloud/privacy'
import type { MatchRecord } from '@/domain/profile/Profile'
import { useCloudStore } from './cloud'
import { useProfileStore } from './profile'

export const usePrivacyStore = defineStore('privacy', () => {
  const enabled = import.meta.env.VITE_TELEMETRY_ENABLED === 'true'
  let generation = 0
  let operation = 0

  const cloud = useCloudStore()
  const profile = useProfileStore()
  const visibility = useDocumentVisibility()

  const choices = shallowRef<PrivacyChoices | null>(null)
  const loaded = ref(false)
  const busy = ref(false)
  const error = ref(false)
  const editing = ref(false)
  const deferred = ref(false)

  const userId = computed(() => (cloud.signedIn ? cloud.account!.id : null))
  const current = computed(() => choices.value?.version === PRIVACY_VERSION)

  const open = computed(() =>
    Boolean(
      enabled &&
      userId.value &&
      (editing.value || (loaded.value && !current.value && !deferred.value)) &&
      !cloud.signInOpen &&
      (!cloud.conflict || cloud.conflictDeferred),
    ),
  )

  async function refresh() {
    const id = userId.value
    if (!enabled || !id || busy.value) {
      return
    }

    const token = generation
    const request = ++operation

    try {
      const next = await (await cloud.connect()).privacy(id).load()
      if (token !== generation || request !== operation) {
        return
      }

      choices.value = next
      loaded.value = true
      error.value = false
    } catch {
      if (token !== generation || request !== operation) {
        return
      }

      choices.value = null
      loaded.value = false
      error.value = true
    }
  }

  async function save(telemetry: boolean) {
    const id = userId.value
    if (!enabled || !id || busy.value) {
      return
    }

    const token = generation
    ++operation

    busy.value = true
    error.value = false

    // Pause sending while a withdrawal is in flight; only a server acknowledgement enables collection.
    choices.value = null

    try {
      const next = await (await cloud.connect()).privacy(id).save(telemetry)
      if (token !== generation) {
        return
      }

      choices.value = next
      loaded.value = true
      editing.value = false
      deferred.value = false
    } catch {
      if (token === generation) {
        error.value = true
      }
    } finally {
      if (token === generation) {
        busy.value = false
      }
    }
  }

  async function collect(record: MatchRecord) {
    const id = userId.value
    const agreed = choices.value
    if (
      !enabled ||
      !id ||
      busy.value ||
      !current.value ||
      !agreed?.telemetry ||
      !agreed.telemetrySince ||
      Date.parse(record.playedAt) < Date.parse(agreed.telemetrySince)
    ) {
      return
    }

    const token = generation

    try {
      const service = (await cloud.connect()).privacy(id)
      if (token !== generation || choices.value !== agreed) {
        return
      }

      await service.collect(record.id, record.playedAt, telemetryOf(record))
    } catch {
      // Best effort. Do not retain analytics in local storage or replay the cloud history after opting in.
    }
  }

  function edit() {
    editing.value = true

    void refresh()
  }

  function dismiss() {
    if (!busy.value) {
      editing.value = false
      deferred.value = true
    }
  }

  watch(
    userId,
    () => {
      generation++
      operation++

      choices.value = null
      loaded.value = false
      busy.value = false
      error.value = false
      editing.value = false
      deferred.value = false

      void refresh()
    },
    {
      immediate: true,
      flush: 'sync',
    },
  )

  profile.$onAction(({ name, after }) => {
    if (name === 'record') {
      after((record) => {
        if (record) {
          void collect(record)
        }
      })
    }
  })

  useEventListener(globalThis, 'online', () => void refresh())

  watch(visibility, (state) => {
    if (state === 'visible') {
      void refresh()
    }
  })

  return {
    enabled,
    choices,
    loaded,
    busy,
    error,
    open,
    current,
    editing,
    refresh,
    save,
    edit,
    dismiss,
  }
})
