<script setup lang="ts">
import { Trophy } from 'lucide-vue-next'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import InfoTooltip from '../common/InfoTooltip.vue'

const profile = useProfileStore()
const { t } = useGameText()
const completed = computed(() => profile.contracts.filter((contract) => contract.completed).length)

const progressLabel = computed(() =>
  t('career.contractProgress', {
    completed: completed.value,
    total: profile.contracts.length,
  }),
)
</script>

<template>
  <InfoTooltip side="bottom">
    <a
      href="#/career"
      class="career-chip"
      :aria-label="`${t('career.open')} · ${progressLabel}`"
      @click.prevent="profile.openCareer()"
    >
      <span class="content">
        <span class="icon" aria-hidden="true"><Trophy :size="20" /></span>

        <span class="body">
          <span class="label">{{ t('career.title') }}</span>
          <span class="progress-label">{{ progressLabel }}</span>

          <span class="steps" aria-hidden="true">
            <span
              v-for="contract in profile.contracts"
              :key="contract.id"
              :class="{ complete: contract.completed }"
            />
          </span>
        </span>
      </span>

      <span class="compact-count" aria-hidden="true">{{ completed }}/{{ profile.contracts.length }}</span>
    </a>

    <template #content>
      <strong>{{ t('career.open') }}</strong>
      <span class="hint">{{ progressLabel }}</span>

      <span class="hint">
        {{
          profile.nextTrial
            ? t('career.nextUnlock', {
                level: profile.nextTrial.level,
                name: t(`career.trials.${profile.nextTrial.id}.name`),
              })
            : t('career.allUnlocked')
        }}
      </span>
    </template>
  </InfoTooltip>
</template>

<style scoped>
.career-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: var(--coach-card-height, 66px);
  padding: 0 22px;
  border-radius: 14px;
  border: 1px solid var(--edge-strong);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--chalk);
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.15s ease-out both;
}

.career-chip:hover {
  border-color: rgba(244, 197, 91, 0.6);
  transform: translateY(-1px);
}

.career-chip:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(244, 197, 91, 0.14);
  color: var(--gold);
}

.content {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
}

.hint {
  display: block;
  margin-top: 4px;
  color: var(--chalk-dim);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.progress-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--chalk-dim);
  white-space: nowrap;
}

.steps {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}

.steps span {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--edge-strong);
}

.steps .complete {
  background: var(--gold);
}

.compact-count {
  display: none;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1199px) {
  .career-chip {
    flex-direction: column;
    gap: 6px;
    width: 80px;
    padding: 0 20px;
  }

  .body {
    display: none;
  }

  .compact-count {
    display: block;
  }
}
</style>
