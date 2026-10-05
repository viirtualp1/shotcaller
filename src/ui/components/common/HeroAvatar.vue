<script setup lang="ts">
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, RoleId, StarLevel, TeamId } from '@/content/ids'
import { cssColor } from '@/rendering/theme'
import { starsLabel } from '../../composables/useGameText'
import { ADAPTIVE_ICON, ROLE_ICONS } from '../../icons'

/**
 * `fill` sizes the avatar from its container's width, which must be a size container. `role` is the one the hero
 * took on its lane; an adaptive hero without one shows its mask.
 */
const props = withDefaults(
  defineProps<{
    heroId: HeroId
    team?: TeamId
    stars?: StarLevel
    size?: number
    fill?: boolean
    role?: RoleId
    /** A talent waits to be picked: a gold mark in the corner. */
    pending?: boolean
  }>(),
  {
    team: 0,
    stars: undefined,
    size: 32,
    role: undefined,
    pending: false,
  },
)

const icon = computed(() =>
  props.role
    ? ROLE_ICONS[props.role]
    : HEROES[props.heroId].adaptive
      ? ADAPTIVE_ICON
      : ROLE_ICONS[HEROES[props.heroId].role],
)

const style = computed(() => ({
  '--hero': cssColor(HEROES[props.heroId].color),
  ...(props.fill ? {} : { '--size': `${props.size}px` }),
}))
</script>

<template>
  <span class="avatar" :class="[team === 0 ? 'ours' : 'theirs', { fill }]" :style="style" aria-hidden="true">
    <span class="disc">
      <component :is="icon" :size="Math.round(size * 0.5)" :stroke-width="2.4" />
    </span>

    <span v-if="stars" class="stars">{{ starsLabel(stars) }}</span>
    <span v-if="pending" class="pending" />
  </span>
</template>

<style scoped>
.avatar {
  --team: var(--ours);
  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  flex: none;
}

.theirs {
  --team: var(--theirs);
}

/* Smaller than the dashed cell, so the frame and the stars stay clear of the portrait. */
.avatar.fill {
  --size: 64cqi;
}

.avatar.fill .stars {
  bottom: calc(var(--size) * -0.3);
}

.avatar.fill svg {
  width: 50%;
  height: 50%;
}

.disc {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.28), transparent 45%), var(--hero);
  box-shadow:
    0 0 0 3px var(--team),
    0 3px 6px rgba(0, 0, 0, 0.45);
  color: var(--ink);
  font-size: calc(var(--size) * 0.36);
  font-weight: 700;
  line-height: 1;
}

.pending {
  position: absolute;
  top: -2px;
  right: -2px;
  width: max(9px, calc(var(--size) * 0.26));
  height: max(9px, calc(var(--size) * 0.26));
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 0 2px var(--ink);
  animation: pending-pulse 1.6s ease-in-out infinite;
}

@keyframes pending-pulse {
  50% {
    box-shadow:
      0 0 0 2px var(--ink),
      0 0 10px var(--gold);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pending {
    animation: none;
  }
}

.stars {
  position: absolute;
  bottom: calc(var(--size) * -0.34);
  font-size: calc(var(--size) * 0.3);
  letter-spacing: -0.08em;
  color: var(--gold);
  text-shadow:
    0 1px 0 var(--ink),
    0 0 4px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
}
</style>
