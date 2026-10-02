<script setup lang="ts">
import { computed } from 'vue'
import type { TeamId } from '@/content/ids'
import { useFighterLabels } from '../../composables/useFighterLabels'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import FighterLabel from './FighterLabel.vue'
import type { MeterHero, MeterStat } from './meter'

const props = withDefaults(defineProps<{ heroes: readonly MeterHero[]; stat: MeterStat; team?: TeamId }>(), {
  team: 0,
})

const text = useGameText()
const { t } = text

const rows = computed(() =>
  props.heroes
    .filter((hero) => hero.team === props.team && (props.stat !== 'healing' || hero.healing > 0))
    .sort((a, b) => b[props.stat] - a[props.stat]),
)

/** With heroes on more than one lane, every row names its lane, so twins and lane fights read at a glance. */
const laneShown = computed(() => new Set(rows.value.map((hero) => hero.lane).filter(Boolean)).size > 1)

const maximum = computed(() => Math.max(0, ...rows.value.map((hero) => hero[props.stat])))

const fighterLabel = useFighterLabels(() => props.heroes, laneShown)

const share = (hero: MeterHero) =>
  maximum.value > 0 ? Math.min(100, Math.max(0, (hero[props.stat] / maximum.value) * 100)) : 0
</script>

<template>
  <div class="hero-meter" :class="[stat, { enemy: team === 1 }]">
    <ol v-if="rows.length" class="meter">
      <li v-for="hero in rows" :key="hero.uid" class="row" :class="{ dead: hero.dead }">
        <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="30" />

        <div class="stat-line">
          <div class="reading">
            <span v-if="laneShown && hero.lane" class="lane">{{ text.slotName(hero.lane) }}</span>

            <FighterLabel
              v-bind="fighterLabel(hero)"
              :item-size="16"
              class="label"
              :title="fighterLabel(hero).name"
            />

            <span class="value">{{ text.number(Math.round(hero[stat])) }}</span>
          </div>

          <span class="track" aria-hidden="true"><i :style="{ width: `${share(hero)}%` }" /></span>
        </div>
      </li>
    </ol>

    <p v-else class="empty">{{ t(stat === 'healing' ? 'summary.noHealing' : 'report.noHeroes') }}</p>
  </div>
</template>

<style scoped>
.hero-meter {
  --meter-color: var(--ours);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.hero-meter.enemy,
.hero-meter.damageReceived {
  --meter-color: var(--theirs);
}
.hero-meter.healing {
  --meter-color: var(--heal);
}
.empty {
  margin: 0;
  font-size: 11px;
  color: var(--chalk-faint);
}
.meter {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow: auto;
  min-height: 0;
}
.row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}
.row.dead {
  opacity: 0.5;
}
.stat-line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.reading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 6.5ch;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.reading:not(:has(.lane)) {
  grid-template-columns: minmax(0, 1fr) 6.5ch;
}
.lane {
  padding: 1px 6px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.07);
  color: var(--chalk-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.label {
  color: var(--chalk-dim);
}
.value {
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--chalk);
}
.track {
  height: 4px;
  width: 100%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--meter-color);
  opacity: 0.8;
  transition: width 0.2s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .track i {
    transition: none;
  }
}
</style>
