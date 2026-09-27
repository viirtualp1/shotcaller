<script setup lang="ts">
import { useGameText } from '../../composables/useGameText'
import type { NoteBadge } from '../../patchNotes/notes'

defineProps<{ badge: NoteBadge }>()
const { t } = useGameText()
</script>

<template>
  <span class="badge" :class="badge">{{ t(`patchNotes.badges.${badge}`) }}</span>
</template>

<style scoped>
.badge {
  --tone: var(--gold);
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent);
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.reworked {
  --tone: #b89cff;
}

.buffed {
  --tone: var(--heal);
}

.nerfed {
  --tone: var(--theirs);
}
</style>
