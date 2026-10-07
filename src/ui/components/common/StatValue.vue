<script setup lang="ts">
withDefaults(
  defineProps<{
    base: string
    bonus?: string | null
    better?: boolean
  }>(),
  {
    bonus: null,
    better: true,
  },
)
</script>

<template>
  <span class="stat-value">
    <span>{{ base }}</span>
    <span v-if="bonus" class="bonus" :class="{ worse: !better }">{{ bonus }}</span>
  </span>
</template>

<style scoped>
.stat-value {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bonus {
  color: var(--heal);
  font-size: 0.8em;
  font-weight: 700;
}

.bonus.worse {
  color: var(--theirs);
}
</style>
