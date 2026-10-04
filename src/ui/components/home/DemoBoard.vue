<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import BoardFrame from '../board/BoardFrame.vue'
import { useGameText } from '../../composables/useGameText'

const paused = defineModel<boolean>('paused', { default: false })

const { t } = useGameText()
const still = useMediaQuery('(prefers-reduced-motion: reduce)')
</script>

<template>
  <div class="stage">
    <BoardFrame>
      <slot />
    </BoardFrame>

    <button
      v-if="!still"
      type="button"
      class="icon-btn pause"
      :aria-label="paused ? t('start.home.resume') : t('start.home.pause')"
      :aria-pressed="paused"
      @click="paused = !paused"
    >
      <Play v-if="paused" :size="16" />
      <Pause v-else :size="16" />
    </button>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  height: 100%;
}

.pause {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
}
</style>
