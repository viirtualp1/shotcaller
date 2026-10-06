<script setup lang="ts">
import { MODE_IDS } from '@/content/ids'
import type { ModeRatings } from '@/domain/profile/Profile'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankMedal from '../profile/RankMedal.vue'
import ModeMap from './ModeMap.vue'

/**
 * The rank in every mode, shown from the first day: an untouched mode reads as the starting rank. `compact` keeps the
 * three modes in one row, dropping the pictures when the row gets narrow, for a coach's dossier on a phone.
 */
withDefaults(defineProps<{ ratings: ModeRatings; compact?: boolean }>(), { compact: false })

const text = useGameText()
const { t } = text
</script>

<template>
  <section class="mode-ratings" :class="{ compact }" :aria-label="t('modes.ratings')">
    <article v-for="id in MODE_IDS" :key="id" class="mode">
      <span class="mode-content">
        <ModeMap :mode="id" :size="56" />

        <span class="about">
          <span class="name">{{ t(`modes.${id}.name`) }}</span>

          <strong class="rating">
            <span class="display-number">{{ text.number(ratings[id]) }}</span>
            <span class="mmr">MMR</span>
          </strong>

          <span class="tier">{{ t(`profile.ranks.${rankFor(ratings[id]).tier}`) }}</span>
        </span>
      </span>

      <RankMedal :tier="rankFor(ratings[id]).tier" :stars="rankFor(ratings[id]).stars" :size="48" />
    </article>
  </section>
</template>

<style scoped>
.mode-ratings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
}

.mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: var(--radius);
  background: var(--card);
  border: 1px solid var(--edge);
}

.about {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mode-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 14px;
}

.mode-content :deep(.mode-map) {
  flex: none;
}

.name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.rating {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
  white-space: nowrap;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.rating > span {
  line-height: 1;
}

.tier {
  font-size: 12px;
  color: var(--chalk-faint);
}

.mmr {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  color: var(--chalk-faint);
}
.mode-ratings.compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  container-type: inline-size;
}

.compact .mode {
  padding: 12px 14px;
}

@container (max-width: 640px) {
  .compact .mode {
    justify-content: center;
    padding: 10px 6px;
    text-align: center;
  }

  .compact .mode-content :deep(.mode-map),
  .compact .mode > :deep(.medal) {
    display: none;
  }

  .compact .about {
    align-items: center;
  }

  .compact .name {
    font-size: 10px;
    letter-spacing: 0.03em;
  }

  .compact .rating {
    font-size: 18px;
  }

  .compact .tier {
    font-size: 11px;
  }
}
</style>
