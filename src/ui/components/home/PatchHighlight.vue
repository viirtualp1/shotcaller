<script setup lang="ts">
import { ScrollText } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { isFresh, LATEST_PATCH } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import NoteLine from '../patchNotes/NoteLine.vue'

/** The latest patch on the start screen: the title, then one line worth opening. */
const lead = LATEST_PATCH.card ?? LATEST_PATCH.features?.[0]?.text ?? LATEST_PATCH.general?.[0] ?? null

const notes = usePatchNotesStore()
const { t } = useGameText()
</script>

<template>
  <a :href="`/patches/${LATEST_PATCH.version}/`" class="patch" @click.prevent="notes.open()">
    <span class="eyebrow">
      <ScrollText :size="14" /> {{ t('patchNotes.patch', { version: LATEST_PATCH.version }) }}
      <span v-if="isFresh(LATEST_PATCH)" class="fresh">{{ t('start.home.fresh') }}</span>
    </span>

    <NoteLine :text="LATEST_PATCH.title" class="title hand" />

    <NoteLine v-if="lead" :text="lead" class="lead" />
  </a>
</template>

<style scoped>
.patch {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 100% 0%, rgba(244, 197, 91, 0.12), transparent 60%), rgba(255, 255, 255, 0.03);
  color: var(--chalk);
  text-decoration: none;
  transition: border-color 0.15s;
}

.patch:hover {
  border-color: rgba(244, 197, 91, 0.6);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fresh {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.title {
  font-size: 32px;
  line-height: 1;
}

.lead {
  overflow: hidden;
  color: var(--chalk-dim);
  font-size: 13px;
  line-height: 1.45;
}
</style>
