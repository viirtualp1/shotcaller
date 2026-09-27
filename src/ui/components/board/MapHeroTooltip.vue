<script setup lang="ts">
import { autoUpdate, flip, offset, shift, useFloating, type VirtualElement } from '@floating-ui/vue'
import { computed, ref } from 'vue'
import type { BoardRenderer } from '@/rendering/BoardRenderer'
import type { HeroHit } from '@/rendering/views/HeroToken'
import { useGameText } from '../../composables/useGameText'
import { locateHero, useMatchStore } from '../../stores/match'
import HeroDetails from '../common/HeroDetails.vue'

const props = defineProps<{ renderer: BoardRenderer; hit: HeroHit }>()

const store = useMatchStore()
const { t } = useGameText()
const floating = ref<HTMLElement | null>(null)

let lastBounds = new DOMRect()

const anchor = computed<VirtualElement>(() => {
  const { renderer, hit } = props
  return { getBoundingClientRect: () => (lastBounds = renderer.heroBounds(hit.uid) ?? lastBounds) }
})

const { floatingStyles } = useFloating(anchor, floating, {
  placement: 'top',
  transform: false,
  middleware: [offset(12), flip(), shift({ padding: 12 })],
  whileElementsMounted: (reference, element, update) =>
    autoUpdate(reference, element, update, { animationFrame: true }),
})

const enemy = computed(() => props.hit.team === 1)

const located = computed(() => {
  const view = store.view
  if (!view) {
    return null
  }

  return locateHero(enemy.value ? view.opponent : view.human, props.hit.uid)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="located" ref="floating" class="tooltip map-tooltip" :class="{ enemy }" :style="floatingStyles">
      <span v-if="enemy" class="side">{{ t('card.enemy') }}</span>
      <HeroDetails :hero-id="located.hero.heroId" :stars="located.hero.stars" :items="located.hero.items" />
    </div>
  </Teleport>
</template>

<style scoped>
.map-tooltip {
  pointer-events: none;
}

.map-tooltip.enemy {
  border-color: rgba(255, 112, 96, 0.55);
}

.side {
  display: block;
  margin-bottom: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theirs);
}
</style>
