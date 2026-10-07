<script setup lang="ts">
import { useGameText } from '../../composables/useGameText'

const props = defineProps<{ requestedVersion?: string }>()

const { t } = useGameText()
</script>

<template>
  <aside v-if="props.requestedVersion" class="release-notice" role="status">
    <strong>{{ t('pwa.oldPatchTitle') }}</strong>
    <p>{{ t('pwa.oldPatchHint', { version: props.requestedVersion }) }}</p>
  </aside>
</template>

<style scoped>
.release-notice {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(244, 197, 91, 0.45);
  border-radius: var(--radius);
  background: linear-gradient(120deg, rgba(244, 197, 91, 0.12), rgba(244, 197, 91, 0.03));
  color: var(--chalk);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  overflow-wrap: anywhere;
}

strong {
  color: var(--gold);
  font-size: 15px;
}

p {
  margin: 0;
}
</style>
