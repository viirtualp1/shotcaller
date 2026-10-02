<script setup lang="ts">
import { computed } from 'vue'
import { RANK, RANK_TIERS } from '@/content/profile'
import type { Rank } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import RankMedal from './RankMedal.vue'

const props = defineProps<{ rank: Rank }>()
const text = useGameText()
const { t } = text
const current = computed(() => RANK_TIERS.indexOf(props.rank.tier))
const floorOf = (index: number) => index * RANK.starsPerTier * RANK.pointsPerStar
</script>

<template>
  <section class="ladder" :aria-label="t('profile.ladder')">
    <ol>
      <li
        v-for="(tier, i) in RANK_TIERS"
        :key="tier"
        :class="{ reached: i < current, current: i === current }"
        :aria-current="i === current ? 'step' : undefined"
      >
        <RankMedal :tier="tier" :stars="i === current ? rank.stars : 0" :size="46" :dim="i > current" />

        <span class="tier">{{ t(`profile.ranks.${tier}`) }}</span>

        <span class="floor">{{ text.mmr(floorOf(i)) }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.ladder {
  container-type: inline-size;
  overflow-x: auto;
}

ol {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 6px 4px 2px;
  list-style: none;
}

li {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 84px;
  padding: 12px 6px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
}

li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 35px;
  left: calc(50% + 32px);
  right: calc(-50% + 32px);
  height: 2px;
  background: var(--edge);
}

li.reached:not(:last-child)::after {
  background: linear-gradient(90deg, rgba(244, 197, 91, 0.6), rgba(244, 197, 91, 0.25));
}

.current {
  border-color: rgba(244, 197, 91, 0.5);
  background: rgba(244, 197, 91, 0.07);
}

.tier {
  max-width: 100%;
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--chalk-dim);
  text-align: center;
  overflow-wrap: anywhere;
}

.current .tier {
  color: var(--chalk);
}

.floor {
  font-size: 11px;
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}

@container (max-width: 660px) {
  ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
    min-width: 0;
  }
  li {
    min-width: 0;
  }
  li:not(:last-child)::after {
    display: none;
  }
}

@media (max-width: 720px) {
  ol {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
  }
  li {
    min-width: 0;
    padding: 8px 4px;
    gap: 4px;
  }
  li:not(:last-child)::after {
    display: none;
  }
}
</style>
