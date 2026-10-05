<script setup lang="ts">
import { MessageSquare } from '@lucide/vue'
import { ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import SupportDialog from '../dialogs/SupportDialog.vue'

const { t } = useGameText()
const open = ref(false)
</script>

<template>
  <button class="btn ghost support-button" type="button" @click="open = true">
    <MessageSquare :size="14" />
    <span>{{ t('support.button') }}</span>
  </button>

  <SupportDialog v-model:open="open" />
</template>

<style scoped>
.support-button {
  height: var(--control-height);
  padding: 5px 10px;
  font-size: 12px;
  color: var(--chalk-dim);
}

.support-button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
