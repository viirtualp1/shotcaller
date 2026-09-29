<script setup lang="ts">
import { computed, ref } from 'vue'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import HeroAvatar from '../common/HeroAvatar.vue'
import type { MeterStat } from './DamageMeter.vue'
import MeterTabs from './MeterTabs.vue'

defineProps<{ placeholder?: boolean }>()

const store = useMatchStore()
const text = useGameText()
const { t } = text
const stat = ref<MeterStat>('damageDealt')

const summary = computed(() => (store.phase === 'planning' ? (store.view?.summary ?? null) : null))

const rows = computed(() => {
  const key = stat.value

  const heroes = (summary.value?.heroes ?? [])
    .filter((hero) => hero.team === 0 && hero[key] > 0)
    .sort((a, b) => b[key] - a[key])

  const top = Math.max(1, heroes[0]?.[key] ?? 1)

  return heroes.map((hero) => ({
    ...hero,
    value: hero[key],
    share: hero[key] / top,
  }))
})
</script>

<template>
  <p v-if="!summary && placeholder" class="empty">{{ t('summary.noRound') }}</p>

  <HudPanel v-else-if="summary" class="panel" :title="t('summary.lastRound', { round: summary.round })">
    <MeterTabs v-model="stat" />

    <p v-if="stat === 'healing' && !rows.length" class="empty">{{ t('summary.noHealing') }}</p>

    <ol v-else class="meter" :class="stat">
      <li v-for="hero in rows" :key="hero.uid" class="row" :class="hero.team === 0 ? 'ours' : 'theirs'">
        <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="36" />

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
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 700;
}

.row.theirs {
  --team: var(--theirs);
}

.bar {
  position: relative;
  height: 36px;
  border-radius: 10px;
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
}

.damageReceived .bar i {
  background: color-mix(in srgb, var(--theirs) 35%, transparent);
}

.label {
  position: relative;
  display: block;
  padding-left: 12px;
  line-height: 36px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value {
  min-width: 3.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--chalk);
}

.empty {
  margin: 0;
  font-size: 13.5px;
  color: var(--chalk-faint);
}
</style>
