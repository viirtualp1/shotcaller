<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref } from 'vue'
import type { Rank } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankLadder from './RankLadder.vue'
import RankMedal from './RankMedal.vue'

withDefaults(defineProps<{ rank: Rank; size?: number }>(), { size: 112 })

const { t } = useGameText()
const open = ref(false)
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="rank-toggle"
        :aria-label="t('profile.ladder')"
        @click.stop
        @keydown.down.prevent="open = true"
      >
        <RankMedal :tier="rank.tier" :stars="rank.stars" :size="size" />
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        class="rank-dropdown"
        side="bottom"
        align="center"
        :side-offset="12"
        :collision-padding="16"
        :aria-label="t('profile.ladder')"
        @open-auto-focus.prevent
      >
        <RankLadder :rank="rank" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.rank-toggle {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.rank-toggle:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

:global(.rank-dropdown) {
  z-index: 60;
  width: min(840px, calc(100vw - 32px));
  max-height: var(--reka-popover-content-available-height);
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--edge-strong);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}
</style>
