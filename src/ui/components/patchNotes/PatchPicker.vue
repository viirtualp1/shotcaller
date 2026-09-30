<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { PATCH_NOTES } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import NoteLine from './NoteLine.vue'

const notes = usePatchNotesStore()
const { t } = useGameText()

const version = computed({
  get: () => notes.patch?.version,
  set: (value: string | undefined) => value && notes.select(value),
})
</script>

<template>
  <SelectRoot v-model="version">
    <SelectTrigger class="btn picker" :aria-label="t('patchNotes.choose')">
      {{ t('patchNotes.patch', { version }) }}
      <ChevronDown :size="16" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="menu-content patch-menu"
        position="popper"
        side="bottom"
        align="end"
        :side-offset="6"
      >
        <SelectViewport class="patch-list">
          <SelectItem
            v-for="patch in PATCH_NOTES"
            :key="patch.version"
            :value="patch.version"
            class="menu-item"
          >
            <span class="option">
              <SelectItemText>{{ t('patchNotes.patch', { version: patch.version }) }}</SelectItemText>
              <NoteLine :text="patch.title" class="option-title" />
            </span>

            <SelectItemIndicator class="tick">
              <Check :size="15" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.picker {
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  font-weight: 700;
}

.option-title {
  font-weight: 400;
  font-size: 12px;
  color: var(--chalk-dim);
}

.tick {
  margin-left: auto;
  color: var(--gold);
}
</style>

<style>
.patch-menu {
  width: max-content;
  max-width: min(320px, calc(100vw - 32px));
  transform-origin: var(--reka-select-content-transform-origin);
}

/* reka hides the list's scrollbar in favour of scroll buttons; this long list shows the gold one instead. */
.patch-list[data-reka-select-viewport] {
  max-height: 500px;
  scrollbar-width: auto;
}

.patch-list[data-reka-select-viewport]::-webkit-scrollbar {
  display: block;
}

@media (max-width: 560px) {
  .patch-list {
    max-height: min(320px, 55dvh);
  }
}
</style>
