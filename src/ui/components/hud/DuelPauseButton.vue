<script setup lang="ts">
import { Pause } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

/** The shared duel pause: two per coach, with a cooldown between them. */
const duel = useDuelStore()
const { t } = useGameText()

const title = computed(() => {
  if (duel.pausesLeft === 0) {
    return t('duel.pause.none')
  }

  return duel.pauseCooldown > 0
    ? t('duel.pause.cooldown', { s: duel.pauseCooldown })
    : t('duel.pause.button', { n: duel.pausesLeft })
})
</script>

<template>
  <button
    v-if="!duel.paused"
    type="button"
    class="icon-btn duel-pause"
    :disabled="!duel.canPause"
    :aria-label="title"
    :title="`${title} · F9`"
    @click="duel.pause()"
  >
    <Pause :size="16" />
    <span class="count" aria-hidden="true">{{ duel.pausesLeft }}</span>
  </button>
</template>

<style scoped>
.duel-pause {
  position: relative;
}

.duel-pause:disabled {
  cursor: default;
  opacity: 0.5;
}

.count {
  position: absolute;
  right: -5px;
  bottom: -5px;
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}
</style>
