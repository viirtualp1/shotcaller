<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, ref } from 'vue'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import HeroAvatar from '../common/HeroAvatar.vue'
import type { MeterStat } from './DamageMeter.vue'

const STATS: readonly MeterStat[] = ['damageDealt', 'healing', 'damageReceived']

const store = useMatchStore()
const text = useGameText()
const { t } = text
const stat = ref<MeterStat>('damageDealt')

const summary = computed(() => (store.phase === 'planning' ? (store.view?.summary ?? null) : null))

const meterModel = computed({
  get: () => stat.value,
  set: (value: string | undefined) => {
    if (value) {
      stat.value = value as MeterStat
    }
  },
})

const rows = computed(() => {
  const key = stat.value

  const heroes = (summary.value?.heroes ?? []).filter((hero) => hero[key] > 0).sort((a, b) => b[key] - a[key])

  const top = Math.max(1, heroes[0]?.[key] ?? 1)

  return heroes.map((hero) => ({
    ...hero,
    value: hero[key],
    share: hero[key] / top,
  }))
})
</script>

<template>
  <HudPanel v-if="summary" class="panel" :title="t('summary.lastRound', { round: summary.round })">
    <ToggleGroupRoot v-model="meterModel" type="single" class="tabs" :aria-label="t('summary.heroes')">
      <ToggleGroupItem v-for="item in STATS" :key="item" :value="item" class="tab">
        {{ t(`battle.${item}`) }}
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <p v-if="stat === 'healing' && !rows.length" class="empty">{{ t('summary.noHealing') }}</p>

    <ol v-else class="meter" :class="stat">
      <li v-for="hero in rows" :key="hero.uid" class="row" :class="hero.team === 0 ? 'ours' : 'theirs'">
        <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="20" />

        <span class="bar">
          <i :style="{ width: `${hero.share * 100}%` }" />
          <span class="label">{{ text.heroName(hero.heroId) }} {{ starsLabel(hero.stars) }}</span>
        </span>

        <span class="value">{{
          stat === 'healing' ? `+${text.number(hero.value)}` : text.number(hero.value)
        }}</span>
      </li>
    </ol>
  </HudPanel>
</template>

<style scoped>
.panel {
  flex: 0 1 auto;
  min-height: 0;
}

.tabs {
  display: grid;
  flex: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}

.tab {
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.tab[data-state='on'] {
  background: rgba(255, 255, 255, 0.1);
  color: var(--chalk);
}

.meter {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  margin: 0;
  /* The team ring is drawn outside the disc, so the scrollport needs room or it slices the icon. */
  padding: 4px 0 8px 4px;
  overflow-x: hidden;
  overflow-y: auto;
  list-style: none;
}

.row {
  --team: var(--ours);
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  column-gap: 8px;
  font-size: 12px;
}

.row.theirs {
  --team: var(--theirs);
}

.bar {
  position: relative;
  height: 18px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--team) 45%, transparent);
}

.healing .bar i {
  background: color-mix(in srgb, var(--heal) 40%, transparent);
  box-shadow: inset 3px 0 0 var(--team);
}

.damageReceived .bar i {
  background: color-mix(in srgb, var(--theirs) 35%, transparent);
  box-shadow: inset 3px 0 0 var(--team);
}

.label {
  position: relative;
  padding-left: 6px;
  line-height: 18px;
  white-space: nowrap;
}

.value {
  min-width: 2.6em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--chalk-dim);
}

.empty {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}
</style>
