<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { useGameText } from '../../composables/useGameText'

defineProps<{ code: string }>()

const { t } = useGameText()
const { copy, copied, isSupported } = useClipboard()
</script>

<template>
  <p class="own-code">
    <span class="label">{{ t('friends.codeLine', { code }) }}</span>

    <button
      type="button"
      class="copy"
      :disabled="!isSupported"
      :aria-label="copied ? t('friends.copied') : t('friends.copy')"
      :title="copied ? t('friends.copied') : t('friends.copy')"
      @click="copy(code)"
    >
      <Check v-if="copied" :size="14" class="done" />
      <Copy v-else :size="14" />
    </button>
  </p>
</template>

<style scoped>
.own-code {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  margin: 0;
  color: var(--chalk-faint);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.copy {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.copy:hover:not(:disabled) {
  color: var(--chalk);
}

.done {
  color: var(--heal);
}

.copy:disabled {
  cursor: default;
  opacity: 0.45;
}
</style>
