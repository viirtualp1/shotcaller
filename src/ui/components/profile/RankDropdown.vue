<script setup lang="ts">
import { useElementBounding, useTimeoutFn, useWindowSize } from '@vueuse/core'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, nextTick, ref, watch } from 'vue'
import type { Rank } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankLadder from './RankLadder.vue'
import RankMedal from './RankMedal.vue'

withDefaults(defineProps<{ rank: Rank; size?: number }>(), { size: 112 })

const { t } = useGameText()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const bounds = useElementBounding(trigger)
const viewport = useWindowSize({ includeScrollbar: false })

// Constrain the width symmetrically so the panel stays centered under the medal.
const width = computed(() => {
  const center = bounds.x.value + bounds.width.value / 2
  const halfSpace = Math.min(center - 16, viewport.width.value - center - 16)
  return Math.min(840, Math.max(0, halfSpace * 2))
})

watch(open, async (shown) => {
  if (shown) {
    await nextTick()
    bounds.update()
  }
})

const { start: closeSoon, stop: keepOpen } = useTimeoutFn(() => (open.value = false), 200, {
  immediate: false,
})

function show(event: PointerEvent) {
  keepOpen()

  if (event.pointerType !== 'touch') {
    open.value = true
  }
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        ref="trigger"
        type="button"
        class="rank-toggle"
        :aria-label="t('profile.ladder')"
        @click.stop
        @keydown.down.prevent="open = true"
        @pointerenter="show"
        @pointerleave="closeSoon()"
      >
        <RankMedal :tier="rank.tier" :stars="rank.stars" :size="size" />
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        class="rank-dropdown"
        side="bottom"
        align="center"
        :style="{ width: `${width}px` }"
        :side-offset="12"
        :collision-padding="16"
        :aria-label="t('profile.ladder')"
        @pointerenter="keepOpen()"
        @pointerleave="closeSoon()"
        @open-auto-focus.prevent
        @close-auto-focus.prevent
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
