<script setup lang="ts">
import { Check, Target, Trophy } from '@lucide/vue'
import { computed } from 'vue'
import { trialPassed } from '@/domain/profile/career'
import type { CareerReward } from '@/domain/profile/career'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useProfileStore } from '../../stores/profile'

const profile = useProfileStore()
const match = useMatchStore()
const { t } = useGameText()
const passed = computed(() => profile.lastRecord && trialPassed(profile.lastRecord))

const rewardName = (reward: CareerReward) =>
  t(
    `career.${reward.kind === 'achievement' ? 'achievements' : reward.kind === 'weekly' ? 'contracts' : 'trials'}.${reward.id}.name`,
  )

function openCareer() {
  match.leaveToMenu()
  profile.openCareer()
}
</script>

<template>
  <section v-if="profile.lastRecord" class="recap" aria-live="polite">
    <div v-if="profile.lastRecord.trialId" class="trial-result" :class="{ passed }">
      <Check v-if="passed" :size="16" /><Target v-else :size="16" />

      <span
        ><strong>{{ t(`career.trials.${profile.lastRecord.trialId}.name`) }}</strong> ·
        {{ passed ? t('career.trialPassed') : t('career.trialMissed') }}</span
      >
    </div>

    <div v-if="profile.lastRecord.rewards.length" class="rewards">
      <span v-for="reward in profile.lastRecord.rewards" :key="`${reward.kind}:${reward.id}`" class="reward">
        <Trophy :size="13" /> {{ rewardName(reward) }} · +{{ reward.xp }} XP
      </span>
    </div>

    <p v-for="trial in profile.lastProgress?.unlocked ?? []" :key="trial.id" class="unlock">
      {{ t('career.unlocked', { name: t(`career.trials.${trial.id}.name`) }) }}
    </p>

    <div class="bottom">
      <span
        >{{ profile.contracts.filter((contract) => contract.completed).length }}/3
        {{ t('career.weeklyCompleted') }}</span
      >

      <button type="button" class="career-link" @click="openCareer">{{ t('career.open') }} →</button>
    </div>
  </section>
</template>

<style scoped>
.recap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.trial-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--chalk-dim);
}
.trial-result.passed {
  color: var(--heal);
}
.rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.reward {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(244, 197, 91, 0.08);
  color: var(--gold);
  font-size: 12px;
}
.unlock {
  margin: 0;
  color: var(--heal);
  font-size: 12px;
}
.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--chalk-faint);
}
.career-link {
  border: 0;
  background: none;
  padding: 6px;
  cursor: pointer;
  color: var(--gold);
  font: inherit;
}
.career-link:hover {
  text-decoration: underline;
}
</style>
