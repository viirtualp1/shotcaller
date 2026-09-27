<script setup lang="ts">
import { computed } from 'vue'
import type { NoteText } from '../../patchNotes/notes'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{ text: NoteText }>()
const settings = useSettingsStore()

/** Odd parts sat between `**` marks and are highlighted. */
const parts = computed(() => props.text[settings.locale].split(/\*\*(.+?)\*\*/))
</script>

<template>
  <span>
    <template v-for="(part, i) in parts" :key="i">
      <b v-if="i % 2" class="value">{{ part }}</b>
      <template v-else>{{ part }}</template>
    </template>
  </span>
</template>

<style scoped>
.value {
  color: var(--gold);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
