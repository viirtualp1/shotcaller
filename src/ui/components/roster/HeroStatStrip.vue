<script setup lang="ts">
import { computed } from 'vue'
import type { HeroId, StarLevel } from '@/content/ids'
import type { HeroSheet } from '@/domain/roster/heroSheet'
import { useGameText } from '../../composables/useGameText'
import { useHeroStats } from '../../composables/useHeroStats'
import InfoTooltip from '../common/InfoTooltip.vue'
import StatValue from '../common/StatValue.vue'

/**
 * Dota-style stat column folded into one strip: an icon and a number per stat, the name and its meaning on hover or
 * tap. Health is left to the bar above it.
 */
const props = defineProps<{
  sheet: HeroSheet
  heroId: HeroId
  stars: StarLevel
}>()

const { t } = useGameText()
const stats = useHeroStats()

const rows = computed(() =>
  stats.sheetRows(props.sheet, props.heroId, props.stars).filter((row) => row.key !== 'hp'),
)
</script>

<template>
  <ul class="stat-strip" :aria-label="t('card.statsHint')">
    <li v-for="row in rows" :key="row.key">
      <InfoTooltip side="top" clickable>
        <button type="button" class="stat" :class="row.key" :aria-label="row.label">
          <component :is="row.icon" :size="13" aria-hidden="true" />
          <StatValue :base="row.base" :bonus="row.bonus" :better="row.better" />
        </button>

        <template #content>
          <strong class="tip-title">{{ row.label }}</strong>
          <span class="tip-text">{{ row.hint }}</span>
        </template>
      </InfoTooltip>
    </li>
  </ul>
</template>

<style scoped>
/* Two rows, as Dota stacks its attributes; each cell as wide as its number. */
.stat-strip {
  display: grid;
  grid-template-rows: repeat(2, auto);
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  gap: 2px 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 3px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: help;
}

.stat:hover,
.stat:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.stat svg {
  flex: none;
  color: var(--chalk-dim);
}

.stat.damage svg {
  color: #ff9a6b;
}

.stat.armor svg {
  color: var(--ours);
}

.stat.spellAmp svg,
.stat.healAmp svg {
  color: var(--mana);
}

.tip-title {
  display: block;
}

.tip-text {
  color: var(--chalk-dim);
}
</style>
