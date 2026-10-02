<script setup lang="ts">
import { computed } from 'vue'
import { isRated } from '@/domain/profile/Profile'
import { levelFor, rankFor, rankStep } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import RankMedal from './RankMedal.vue'

const profile = useProfileStore()
const text = useGameText()
const { t } = text

/** What the match that just ended did to the coach's rank and level. */
const progress = computed(() => {
  const record = profile.lastRecord
  if (!record) {
    return null
  }

  const before = rankFor(record.ratingBefore)
  const after = rankFor(record.ratingAfter)
  const level = levelFor(profile.profile.xp)
  const bonus = record.rewards.reduce((sum, reward) => sum + reward.xp, 0)

  return {
    record,
    rated: isRated(record),
    rank: after,
    delta: record.ratingAfter - record.ratingBefore,
    rankUp: rankStep(after) > rankStep(before),
    level: level.level,
    bonus,
    levelUp: profile.lastProgress
      ? profile.lastProgress.afterLevel > profile.lastProgress.beforeLevel
      : level.level > levelFor(profile.profile.xp - record.xp - bonus).level,
  }
})
</script>

<template>
  <section v-if="progress" class="progress">
    <RankMedal :tier="progress.rank.tier" :stars="progress.rank.stars" :size="46" />

    <div class="cell">
      <span class="eyebrow">{{ t('profile.progress.rating') }}</span>

      <span class="line">
        <strong>{{ text.mmr(progress.record.ratingAfter) }}</strong>

        <span
          v-if="progress.rated"
          class="delta"
          :class="{ up: progress.delta > 0, down: progress.delta < 0 }"
          >{{ text.mmr(progress.delta, true) }}</span
        >
      </span>

      <span v-if="progress.rankUp" class="badge">
        {{ t('profile.progress.rankUp') }}: {{ t(`profile.ranks.${progress.rank.tier}`) }}
        {{ '★'.repeat(progress.rank.stars) }}
      </span>

      <span v-else-if="progress.rated" class="muted"
        >{{ t(`profile.ranks.${progress.rank.tier}`) }} {{ '★'.repeat(progress.rank.stars) }}</span
      >
    </div>

    <div class="cell">
      <span class="eyebrow">{{ t('profile.progress.xp') }}</span>

      <span class="line">
        <strong>+{{ text.number(progress.record.xp + progress.bonus) }}</strong>
      </span>

      <span v-if="progress.levelUp" class="badge">
        {{ t('profile.progress.levelUp') }}: {{ t('profile.level', { level: progress.level }) }}
      </span>

      <span v-else class="muted">{{ t('profile.level', { level: progress.level }) }}</span>

      <span v-if="progress.bonus" class="muted">{{
        t('career.rewardBreakdown', { match: progress.record.xp, bonus: progress.bonus })
      }}</span>
    </div>
  </section>
</template>

<style scoped>
.progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 28px;
  padding: 12px 16px 16px;
  border-radius: var(--radius);
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
