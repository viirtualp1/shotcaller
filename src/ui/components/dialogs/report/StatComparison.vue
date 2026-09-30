<script setup lang="ts">
import type { TeamId } from '@/content/ids'
import { useGameText } from '../../../composables/useGameText'
import type { ComparisonRow } from './reportModel'

defineProps<{ rows: readonly ComparisonRow[] }>()

const text = useGameText()
const format = (value: number) => text.number(Math.round(value))

const share = (row: ComparisonRow, team: TeamId) => {
  const top = Math.max(row.values[0], row.values[1], 1)

  return `${(row.values[team] / top) * 100}%`
}

const leads = (row: ComparisonRow, team: TeamId) => row.values[team] > row.values[team === 0 ? 1 : 0]
</script>

<template>
  <ul class="compare">
    <li v-for="(row, i) in rows" :key="row.key" class="row anim-slide" :style="{ '--i': i }">
      <span class="value ours" :class="{ lead: leads(row, 0) }">{{ format(row.values[0]) }}</span>
      <span class="bar ours"><i :style="{ width: share(row, 0) }" /></span>
      <span class="label">{{ row.label }}</span>
      <span class="bar theirs"><i :style="{ width: share(row, 1) }" /></span>
      <span class="value theirs" :class="{ lead: leads(row, 1) }">{{ format(row.values[1]) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.compare {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

.row {
  display: grid;
  grid-template-columns: minmax(3em, 5.5em) minmax(0, 1fr) minmax(0, 10em) minmax(0, 1fr) minmax(3em, 5.5em);
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.value {
  color: var(--chalk-dim);
}

.value.ours {
  text-align: right;
}

.value.lead {
  color: var(--chalk);
  font-weight: 800;
}

.label {
  overflow-wrap: anywhere;
  text-align: center;
  color: var(--chalk-dim);
}

.bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.bar.ours {
  justify-content: flex-end;
}

.bar i {
  height: 100%;
  border-radius: 4px;
  animation: grow 0.6s ease-out both;
}

.bar.ours i {
  background: var(--ours);
  transform-origin: right;
}

.bar.theirs i {
  background: var(--theirs);
  transform-origin: left;
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}
</style>
