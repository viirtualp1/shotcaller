<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const VISIBLE_MS = 2400

const store = useMatchStore()
const text = useGameText()
const visible = ref(false)
const { start } = useTimeoutFn(() => (visible.value = false), VISIBLE_MS, { immediate: false })

const message = computed(() => {
  const notice = store.notice
  if (!notice) {
    return ''
  }

  if (notice.kind === 'error') {
    return text.errorText(notice.error)
  }

  if (notice.kind === 'timeUp') {
    return text.t('notices.timeUp')
  }

  if (notice.kind === 'arranged') {
    return text.t(notice.changed ? 'notices.arranged' : 'notices.alreadyArranged')
  }

  if (notice.kind === 'itemBought') {
    return text.t('notices.itemBought', { item: text.itemName(notice.itemId) })
  }

  return text.t('notices.promoted', {
    hero: text.heroName(notice.heroId),
    stars: starsLabel(notice.stars),
  })
})

watch(
  () => store.notice?.id,
  (id) => {
    if (id === undefined) {
      return
    }

    visible.value = true
    start()
  },
)
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible && message"
      :key="store.notice?.id"
      class="toast"
      :class="store.notice?.kind"
      role="status"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  translate: -50% 0;
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: 10px;
  background: #0f1614;
  border: 1px solid var(--edge-strong);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  font-weight: 600;
  z-index: 60;
}

.toast.error {
  border-color: rgba(255, 112, 96, 0.6);
}

.toast.arranged {
  border-color: var(--heal);
}

.toast.timeUp {
  border-color: var(--theirs);
}

.toast.promoted,
.toast.itemBought {
  border-color: var(--gold);
  color: var(--gold);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
