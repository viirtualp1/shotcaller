<script setup lang="ts">
import { Swords } from 'lucide-vue-next'
import { computed } from 'vue'
import { levelFor, rankFor, rankStep } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import RankMedal from './RankMedal.vue'

const profile = useProfileStore()
const text = useGameText()
const { t } = text

/** A duel leaves the rank and level alone, and the strip says so instead. */
const friendly = computed(() => Boolean(profile.lastRecord?.duel))

/** What the match that just ended did to the coach's rank and level. */
const progress = computed(() => {
  const record = profile.lastRecord
  if (!record || record.duel) {
    return null
  }

  const before = rankFor(record.ratingBefore)
  const after = rankFor(record.ratingAfter)
  const level = levelFor(profile.profile.xp)

  return {
    record,
    rank: after,
    delta: record.ratingAfter - record.ratingBefore,
    rankUp: rankStep(after) > rankStep(before),
    level: level.level,
    levelUp: level.level > levelFor(profile.profile.xp - record.xp).level,
  }
})

const signed = (value: number) =>
  value > 0 ? `+${text.number(value)}` : value < 0 ? `−${text.number(-value)}` : '±0'
</script>

<template>
  <section v-if="progress" class="progress">
    <RankMedal :tier="progress.rank.tier" :stars="progress.rank.stars" :size="46" />

    <div class="cell">
      <span class="eyebrow">{{ t('profile.progress.rating') }}</span>

      <span class="line">
        <strong>{{ text.number(progress.record.ratingAfter) }}</strong>

        <span class="delta" :class="{ up: progress.delta > 0, down: progress.delta < 0 }">{{
          signed(progress.delta)
        }}</span>
      </span>

      <span v-if="progress.rankUp" class="badge">
        {{ t('profile.progress.rankUp') }}: {{ t(`profile.ranks.${progress.rank.tier}`) }}
        {{ '★'.repeat(progress.rank.stars) }}
      </span>

      <span v-else class="muted"
        >{{ t(`profile.ranks.${progress.rank.tier}`) }} {{ '★'.repeat(progress.rank.stars) }}</span
      >
    </div>

    <div class="cell">
      <span class="eyebrow">{{ t('profile.progress.xp') }}</span>

      <span class="line">
        <strong>+{{ text.number(progress.record.xp) }}</strong>
      </span>

      <span v-if="progress.levelUp" class="badge">
        {{ t('profile.progress.levelUp') }}: {{ t('profile.level', { level: progress.level }) }}
      </span>

      <span v-else class="muted">{{ t('profile.level', { level: progress.level }) }}</span>
    </div>
  </section>

  <p v-else-if="friendly" class="friendly"><Swords :size="16" /> {{ t('profile.progress.friendly') }}</p>
</template>

<style scoped>
.friendly {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
  font-size: 13px;
  color: var(--chalk-dim);
}

.progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 28px;
  padding: 12px 16px 16px;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: rgba(10, 15, 13, 0.35);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.line strong {
  font-size: 20px;
}

.delta {
  font-weight: 800;
  color: var(--chalk-dim);
}

.delta.up {
  color: var(--heal);
}

.delta.down {
  color: var(--theirs);
}

.muted {
  font-size: 12px;
  color: var(--chalk-dim);
}

.badge {
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 800;
  animation: pop-in 0.4s 0.3s ease-out both;
}
</style>
