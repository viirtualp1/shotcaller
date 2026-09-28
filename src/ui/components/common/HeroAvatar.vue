<script setup lang="ts">
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, StarLevel, TeamId } from '@/content/ids'
import { cssColor } from '@/rendering/theme'
import { starsLabel } from '../../composables/useGameText'
import { ROLE_ICONS } from '../../icons'

/** `fill` sizes the avatar from its container's width, which must be a size container. */
const props = withDefaults(
  defineProps<{ heroId: HeroId; team?: TeamId; stars?: StarLevel; size?: number; fill?: boolean }>(),
  {
    team: 0,
    stars: undefined,
    size: 32,
  },
)

const style = computed(() => ({
  '--hero': cssColor(HEROES[props.heroId].color),
  ...(props.fill ? {} : { '--size': `${props.size}px` }),
}))
</script>

<template>
  <span class="avatar" :class="[team === 0 ? 'ours' : 'theirs', { fill }]" :style="style" aria-hidden="true">
    <span class="disc">
      <component :is="ROLE_ICONS[HEROES[heroId].role]" :size="Math.round(size * 0.5)" :stroke-width="2.4" />
    </span>

    <span v-if="stars" class="stars">{{ starsLabel(stars) }}</span>
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

/* Leaves room under the disc for the stars. */
.avatar.fill {
  --size: 62cqi;
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
