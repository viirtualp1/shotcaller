<script setup lang="ts">
import { computed } from 'vue'
import type { NoteText } from '../../patchNotes/notes'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{ text: NoteText }>()
const settings = useSettingsStore()

const URL = /https?:\/\/[^\s]+/g

/** Odd parts sat between `**` marks and are highlighted. */
const parts = computed(() => props.text[settings.locale].split(/\*\*(.+?)\*\*/))

function linked(part: string) {
  const chunks: { text: string; href?: string }[] = []
  let last = 0

  for (const match of part.matchAll(URL)) {
    const index = match.index ?? 0

    if (index > last) {
      chunks.push({ text: part.slice(last, index) })
    }

    const href = match[0] ?? ''
    chunks.push({
      text: href,
      href,
    })

    last = index + href.length
  }

  if (last < part.length || chunks.length === 0) {
    chunks.push({ text: part.slice(last) })
  }

  return chunks
}
</script>

<template>
  <span>
    <template v-for="(part, i) in parts" :key="i">
      <b v-if="i % 2" class="value">{{ part }}</b>

      <template v-else>
        <template v-for="(chunk, j) in linked(part)" :key="j">
          <a v-if="chunk.href" class="link" :href="chunk.href" target="_blank" rel="noreferrer">{{
            chunk.text
          }}</a>

          <template v-else>{{ chunk.text }}</template>
        </template>
      </template>
    </template>
  </span>
</template>

<style scoped>
.value {
  color: var(--gold);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.link {
  color: var(--gold);
  text-underline-offset: 2px;
}
</style>
