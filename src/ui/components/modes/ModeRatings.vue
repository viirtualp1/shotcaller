<script setup lang="ts">
import { MODE_IDS } from '@/content/ids'
import type { ModeRatings } from '@/domain/profile/Profile'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankMedal from '../profile/RankMedal.vue'
import ModeMap from './ModeMap.vue'

/** The rank in every mode, shown from the first day: an untouched mode reads as the starting rank. */
defineProps<{ ratings: ModeRatings }>()

const text = useGameText()
const { t } = text
</script>

<template>
  <section class="mode-ratings" :aria-label="t('modes.ratings')">
    <article v-for="id in MODE_IDS" :key="id" class="mode">
      <ModeMap :mode="id" :size="40" />

      <span class="about">
        <span class="name">{{ t(`modes.${id}.name`) }}</span>
        <strong class="rating">{{ text.number(ratings[id]) }}</strong>
        <span class="tier">{{ t(`profile.ranks.${rankFor(ratings[id]).tier}`) }}</span>
      </span>

      <RankMedal :tier="rankFor(ratings[id]).tier" :stars="rankFor(ratings[id]).stars" :size="38" />
    </article>
  </section>
</template>

<style scoped>
.mode-ratings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 8px;
}

.mode {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.about {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.rating {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.tier {
  font-size: 12px;
  color: var(--chalk-faint);
}
</style>
