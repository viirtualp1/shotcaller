<script setup lang="ts">
import { ArrowUpRight, Trophy } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'

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
  <a
    href="/career/"
    class="career-card"
    :aria-label="`${t('career.open')} · ${progressLabel}`"
    @click.prevent="profile.openCareer()"
  >
    <span class="icon" aria-hidden="true"><Trophy :size="28" /></span>
    <ArrowUpRight :size="20" class="link-icon" aria-hidden="true" />

    <span class="body">
      <strong>{{ t('career.title') }}</strong>
      <span class="progress">{{ progressLabel }}</span>

      <span class="steps" aria-hidden="true">
        <span
          v-for="contract in profile.contracts"
          :key="contract.id"
          :class="{ complete: contract.completed }"
        />
      </span>
    </span>
  </a>
</template>

<style scoped>
.career-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 28px 24px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 0% 0%, rgba(244, 197, 91, 0.1), transparent 70%),
    linear-gradient(180deg, var(--panel), rgba(31, 43, 39, 0.6));
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.career-card:hover {
  border-color: var(--gold);
  background-color: rgba(244, 197, 91, 0.04);
}
.career-card:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 4px;
}
.icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.1);
  color: var(--gold);
}
.link-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--gold);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.body strong {
  font-size: 22px;
  line-height: 1.15;
}
.progress {
  font-size: 12px;
  color: var(--chalk-dim);
}
.steps {
  display: flex;
  gap: 5px;
  margin-top: 4px;
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
@media (max-width: 900px) {
  .career-card {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    padding: 20px;
  }
  .body {
    flex: 1;
  }
  .body strong {
    font-size: 20px;
  }
  .link-icon {
    position: static;
    order: 1;
    margin-left: auto;
    flex: none;
  }
  .steps {
    max-width: 160px;
  }
}
</style>
