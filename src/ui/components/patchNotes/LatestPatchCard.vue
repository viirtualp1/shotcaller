<script setup lang="ts">
import { ArrowRight, ScrollText } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import { isFresh, LATEST_PATCH } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import NoteLine from './NoteLine.vue'

const notes = usePatchNotesStore()
const { t } = useGameText()
const fresh = isFresh(LATEST_PATCH)
</script>

<template>
  <a :href="`#/patches/${LATEST_PATCH.version}`" class="update" @click.prevent="notes.open()">
    <span class="icon">
      <ScrollText :size="20" />
    </span>

    <span class="body">
      <span class="eyebrow">
        {{ t('patchNotes.latest') }} · {{ t('patchNotes.patch', { version: LATEST_PATCH.version }) }}
      </span>

      <NoteLine :text="LATEST_PATCH.title" class="title" />

      <span class="more">
        {{ t('patchNotes.read') }}
        <ArrowRight :size="14" class="arrow" />
      </span>
    </span>

    <span v-if="fresh" class="new">{{ t('patchNotes.new') }}</span>
  </a>
</template>

<style scoped>
.update {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 300px;
  max-width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--edge-strong);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.15s ease-out both;
}

.update:hover {
  border-color: rgba(244, 197, 91, 0.6);
  transform: translateY(-1px);
}

.icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(244, 197, 91, 0.14);
  color: var(--gold);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.eyebrow {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--gold);
}

.arrow {
  transition: translate 0.15s;
}

.update:hover .arrow {
  translate: 3px 0;
}

.new {
  position: absolute;
  top: -8px;
  right: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 0 0 3px var(--board-deep);
}
</style>
