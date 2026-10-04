<script setup lang="ts">
import { ChevronRight, Trophy } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'

/** The week's contracts in one line: how many are done, and which one to go for next. Opens the career. */
const profile = useProfileStore()
const { t } = useGameText()

const completed = computed(() => profile.contracts.filter((contract) => contract.completed).length)
const nextContract = computed(() => profile.contracts.find((contract) => !contract.completed) ?? null)

const share = computed(() => {
  const total = profile.contracts.reduce((sum, contract) => sum + contract.target, 0)
  const done = profile.contracts.reduce((sum, contract) => sum + contract.progress, 0)

  return total ? done / total : 0
})
</script>

<template>
  <a href="/career" class="contracts" @click.prevent="profile.openCareer()">
    <span class="head">
      <span class="title"><Trophy :size="15" /> {{ t('career.tabs.weekly') }}</span>
      <span class="count">{{ completed }}/{{ profile.contracts.length }}</span>
    </span>

    <span class="track"><span :style="{ width: `${Math.round(share * 100)}%` }" /></span>

    <span class="next">
      {{
        nextContract
          ? t('start.home.next', {
              name: t(`career.contracts.${nextContract.id}.name`),
              progress: `${nextContract.progress}/${nextContract.target}`,
            })
          : t('start.home.weekDone')
      }}
      <ChevronRight :size="15" />
    </span>
  </a>
</template>

<style scoped>
.contracts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s;
}

.contracts:hover {
  border-color: rgba(244, 197, 91, 0.5);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.title svg,
.count {
  color: var(--gold);
}

.count {
  font-size: 13px;
  font-weight: 700;
}

.track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffffff12;
}

.track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gold);
  transition: width 0.4s ease-out;
}

.next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--chalk-dim);
}
</style>
