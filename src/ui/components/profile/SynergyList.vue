<script setup lang="ts">
import { computed } from 'vue'
import type { SynergyId } from '@/content/ids'
import { SYNERGY_BY_ID } from '@/content/synergies'
import type { SynergyRecord } from '@/domain/profile/Profile'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import HudPanel from '../common/HudPanel.vue'
import { winRate } from './format'

const SHOWN = 6

const profile = useProfileStore()
const text = useGameText()
const { t } = text

const rows = computed(() =>
  (Object.entries(profile.profile.synergies) as [SynergyId, SynergyRecord][])
    .sort(([, a], [, b]) => b.matches - a.matches || b.wins - a.wins)
    .slice(0, SHOWN)
    .map(([id, record]) => ({
      id,
      record,
      color: cssColor(SYNERGY_BY_ID[id].color),
      winRate: winRate(record.wins, record.matches),
    })),
)
</script>

<template>
  <HudPanel :title="t('profile.synergies.title')" class="panel">
    <ul v-if="rows.length" class="list">
      <li v-for="row in rows" :key="row.id" :style="{ '--synergy': row.color }">
        <span class="dot" />

        <span class="name">
          <strong>{{ text.synergyName(row.id) }}</strong>

          <span class="muted">{{
            t('profile.synergies.matches', { n: row.record.matches }, row.record.matches)
          }}</span>
        </span>

        <span class="rate">{{ row.winRate }}%</span>
      </li>
    </ul>

    <p v-else class="empty">{{ t('profile.synergies.empty') }}</p>
  </HudPanel>
</template>

<style scoped>
.panel {
  padding: 16px 18px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--synergy) 7%, transparent);
}

.dot {
  flex: none;
  width: 10px;
  height: 10px;
  rotate: 45deg;
  border-radius: 2px;
  background: var(--synergy);
  box-shadow: 0 0 10px color-mix(in srgb, var(--synergy) 60%, transparent);
}

.name {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.muted {
  font-size: 12px;
  color: var(--chalk-dim);
}

.rate {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: 0;
  color: var(--chalk-dim);
}
</style>
