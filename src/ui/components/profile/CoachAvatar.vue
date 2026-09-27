<script setup lang="ts">
import type { HeroId } from '@/content/ids'
import HeroAvatar from '../common/HeroAvatar.vue'

withDefaults(defineProps<{ heroId: HeroId; level?: number | null; size?: number }>(), {
  level: null,
  size: 48,
})
</script>

<template>
  <span class="coach" :style="{ '--size': `${size}px` }">
    <HeroAvatar :hero-id="heroId" :size="size" />
    <span v-if="level !== null" class="level">{{ level }}</span>
  </span>
</template>

<style scoped>
.coach {
  position: relative;
  display: inline-grid;
  flex: none;
}

.coach :deep(.disc) {
  box-shadow:
    0 0 0 3px var(--gold),
    0 4px 12px rgba(0, 0, 0, 0.5);
}

.level {
  position: absolute;
  right: calc(var(--size) * -0.1);
  bottom: calc(var(--size) * -0.08);
  min-width: calc(var(--size) * 0.42);
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  box-shadow: 0 0 0 2px var(--board-deep);
  font-size: max(10px, calc(var(--size) * 0.2));
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
