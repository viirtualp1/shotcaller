<script setup lang="ts">
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'

export type MeterStat = 'damageDealt' | 'healing' | 'damageReceived'

const props = defineProps<{ stat: MeterStat }>()

const store = useMatchStore()
const text = useGameText()
const { t } = text

/** Your heroes only. Most never heal, so that list keeps only those who did. */
const rows = computed(() => {
  const heroes = [...(store.live?.heroes.values() ?? [])]
    .filter((h) => h.team === 0 && (props.stat !== 'healing' || h.healing > 0))
    .sort((a, b) => b[props.stat] - a[props.stat])

  const top = Math.max(1, heroes[0]?.[props.stat] ?? 1)
  return heroes.map((h) => ({
    ...h,
    value: h[props.stat],
    share: h[props.stat] / top,
  }))
})
</script>

<template>
  <TransitionGroup v-if="rows.length" name="rank" tag="ol" class="meter" :class="stat">
    <li
      v-for="row in rows"
      :key="row.uid"
      class="row"
      :class="[row.team === 0 ? 'ours' : 'theirs', { dead: row.dead }]"
    >
      <HeroAvatar :hero-id="row.heroId" :team="row.team" :size="36" />

      <span class="bar">
        <i :style="{ width: `${row.share * 100}%` }" />
        <span class="label">{{ text.heroName(row.heroId) }}</span>
      </span>

      <span class="value">{{ row.value }}</span>
    </li>
  </TransitionGroup>

  <p v-else class="empty">{{ t('battle.noHealing') }}</p>
</template>

<style scoped>
.meter {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  margin: 0;
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

.row.dead {
  opacity: 0.5;
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
  transition: width 0.3s ease-out;
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

.rank-move {
  transition: transform 0.35s ease;
}
</style>
