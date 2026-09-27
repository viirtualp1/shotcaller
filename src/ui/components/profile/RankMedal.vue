<script setup lang="ts">
import { Binoculars, Compass, Crown, Flag, Map as MapIcon, Megaphone, Sprout } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import { RANK, type RankTier } from '@/content/profile'
import { cssColor } from '@/rendering/theme'

const ICONS: Readonly<Record<RankTier, Component>> = {
  rookie: Sprout,
  scout: Binoculars,
  tactician: Compass,
  strategist: MapIcon,
  commander: Flag,
  legend: Crown,
  shotcaller: Megaphone,
}

const props = withDefaults(defineProps<{ tier: RankTier; stars?: number; size?: number; dim?: boolean }>(), {
  stars: 0,
  size: 64,
  dim: false,
})

const style = computed(() => ({
  '--tier': cssColor(RANK.colors[props.tier]),
  '--size': `${props.size}px`,
}))
</script>

<template>
  <span class="medal" :class="[tier, { dim }]" :style="style" aria-hidden="true">
    <span class="gem">
      <span class="face">
        <component :is="ICONS[tier]" :size="Math.round(size * 0.4)" :stroke-width="2.2" />
      </span>
    </span>

    <span v-if="stars" class="stars">{{ '★'.repeat(stars) }}</span>
  </span>
</template>

<style scoped>
.medal {
  --hex: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: var(--size);
  height: var(--size);
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
}

.gem {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  clip-path: var(--hex);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--tier) 55%, white),
    var(--tier) 45%,
    color-mix(in srgb, var(--tier) 45%, black)
  );
}

.face {
  display: grid;
  place-items: center;
  width: 80%;
  height: 80%;
  clip-path: var(--hex);
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--tier) 30%, #16201c), #0f1614 75%);
  color: color-mix(in srgb, var(--tier) 75%, white);
}

.stars {
  position: absolute;
  bottom: calc(var(--size) * -0.12);
  font-size: calc(var(--size) * 0.19);
  line-height: 1;
  letter-spacing: -0.04em;
  color: color-mix(in srgb, var(--tier) 40%, white);
  text-shadow:
    0 1px 0 #0b100e,
    0 0 6px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

.shotcaller {
  animation: glow 2.6s ease-in-out infinite;
}

.dim {
  filter: grayscale(0.85) brightness(0.55);
  opacity: 0.7;
  animation: none;
}

@keyframes glow {
  50% {
    filter: drop-shadow(0 0 14px color-mix(in srgb, var(--tier) 70%, transparent));
  }
}

@media (prefers-reduced-motion: reduce) {
  .shotcaller {
    animation: none;
  }
}
</style>
