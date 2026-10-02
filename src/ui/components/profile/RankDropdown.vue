<script setup lang="ts">
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { useMediaQuery } from '@vueuse/core'
import { onUnmounted, ref } from 'vue'
import type { Rank } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankLadder from './RankLadder.vue'
import RankMedal from './RankMedal.vue'

let closeTimer: ReturnType<typeof setTimeout> | undefined

withDefaults(defineProps<{ rank: Rank; size?: number }>(), { size: 112 })

const { t } = useGameText()
const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
const open = ref(false)

function enter(event: PointerEvent) {
  if (!canHover.value || event.pointerType === 'touch') {
    return
  }

  clearTimeout(closeTimer)
  open.value = true
}

function leave() {
  if (canHover.value) {
    closeTimer = setTimeout(() => (open.value = false), 180)
  }
}

function toggle(event: MouseEvent) {
  if (!canHover.value || event.detail === 0) {
    open.value = !open.value
  }
}

onUnmounted(() => clearTimeout(closeTimer))
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverAnchor as-child>
      <button
        type="button"
        class="rank-toggle"
        :aria-label="t('profile.ladder')"
        aria-haspopup="dialog"
        :aria-expanded="open"
        @pointerenter="enter"
        @pointerleave="leave"
        @click.stop="toggle"
        @keydown.down.prevent="open = true"
      >
        <RankMedal :tier="rank.tier" :stars="rank.stars" :size="size" />
      </button>
    </PopoverAnchor>

    <PopoverPortal>
      <PopoverContent
        class="rank-dropdown"
        side="bottom"
        align="center"
        :side-offset="12"
        :collision-padding="16"
        :aria-label="t('profile.ladder')"
        @open-auto-focus.prevent
        @pointerenter="enter"
        @pointerleave="leave"
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
  border-radius: var(--radius);
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
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}
</style>
