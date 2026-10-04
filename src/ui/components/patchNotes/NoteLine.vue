<script setup lang="ts">
import { computed } from 'vue'
import type { NoteText } from '../../patchNotes/notes'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{ text: NoteText }>()
const settings = useSettingsStore()

const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|(https?:\/\/[^\s]+)/g

interface Piece {
  text: string
  href?: string
  mark?: boolean
}

/** Highlights sit between `**`. A `[label](https://…)` is a link, and its label can hold highlights too. */
function pieces(source: string): Piece[] {
  const out: Piece[] = []
  let last = 0

  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0

    if (index > last) {
      out.push({ text: source.slice(last, index) })
    }

    const href = match[2] ?? match[4]

    if (href) {
      out.push({
        text: match[1] ?? href,
        href,
      })
    } else if (match[3]) {
      out.push({
        text: match[3],
        mark: true,
      })
    }

    last = index + match[0].length
  }

  if (last < source.length) {
    out.push({ text: source.slice(last) })
  }

  return out
}

function marked(text: string) {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((bit, index) => ({
      text: bit,
      mark: index % 2 === 1,
    }))
    .filter((bit) => bit.text.length > 0)
}

const line = computed(() => pieces(props.text[settings.locale]))
</script>

<template>
  <span class="line">
    <template v-for="(piece, i) in line" :key="i">
      <a v-if="piece.href" class="link" :href="piece.href" target="_blank" rel="noreferrer">
        <template v-for="(bit, j) in marked(piece.text)" :key="j">
          <b v-if="bit.mark" class="value">{{ bit.text }}</b>

          <template v-else>{{ bit.text }}</template>
        </template>
      </a>

      <b v-else-if="piece.mark" class="value">{{ piece.text }}</b>

      <template v-else>{{ piece.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.line {
  overflow-wrap: anywhere;
}

.value {
  color: var(--gold);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.link {
  color: var(--gold);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
