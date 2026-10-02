<script setup lang="ts">
import { useGameText } from '../composables/useGameText'
import { useReplayStore } from '../stores/replay'

const replay = useReplayStore()
const { t } = useGameText()
</script>

<template>
  <div class="live-waiting">
    <div class="panel">
      <p role="status">{{ t(`replay.liveStatus.${replay.liveStatus}`) }}</p>
      <button type="button" class="btn" @click="replay.close()">{{ t('replay.close') }}</button>
    </div>
  </div>
</template>

<style scoped>
.live-waiting {
  position: fixed;
  inset: 0;
  z-index: 38;
  display: grid;
  place-items: center;
  background: var(--board);
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  color: var(--chalk);
}
</style>
