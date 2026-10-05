<script setup lang="ts">
defineProps<{ title?: string; meta?: string }>()
</script>

<template>
  <section class="hud-panel">
    <header v-if="title || meta || $slots.beside || $slots.actions" class="head">
      <h2 v-if="title" class="title">{{ title }}</h2>
      <slot name="beside" />
      <span v-if="meta" class="meta">{{ meta }}</span>
      <slot name="actions" />
    </header>

    <slot />
  </section>
</template>

<style scoped>
.hud-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  border-radius: var(--radius);
  background: rgba(17, 24, 21, 0.86);
  border: 1px solid var(--edge);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--chalk-dim);
  font-variant-numeric: tabular-nums;
}
</style>
