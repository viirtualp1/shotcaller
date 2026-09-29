<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { EARLIER_SUMMARY, PATCH_NOTES, type PatchNote } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import PatchCard from './PatchCard.vue'

/** The patches either side of this one. The latest points back with a summary of the releases before it. */
const props = defineProps<{ patch: PatchNote }>()

const notes = usePatchNotesStore()
const { t } = useGameText()

const index = computed(() => PATCH_NOTES.indexOf(props.patch))
const older = computed(() => PATCH_NOTES[index.value + 1] ?? null)
const newer = computed(() => (index.value > 0 ? PATCH_NOTES[index.value - 1]! : null))
const isLatest = computed(() => index.value === 0)
</script>

<template>
  <nav v-if="older || newer" class="pager" :aria-label="t('patchNotes.choose')">
    <PatchCard
      v-if="older"
      class="older"
      :href="`#/patches/${older.version}`"
      :icon="ChevronLeft"
      :eyebrow="isLatest ? t('patchNotes.earlier') : t('patchNotes.older')"
      :title="isLatest ? EARLIER_SUMMARY : older.title"
      :action="t('patchNotes.openPatch', { version: older.version })"
      @click.prevent="notes.open(older.version)"
    />

    <PatchCard
      v-if="newer"
      class="newer"
      :href="`#/patches/${newer.version}`"
      :icon="ChevronRight"
      :eyebrow="t('patchNotes.newer')"
      :title="newer.title"
      :action="t('patchNotes.openPatch', { version: newer.version })"
      @click.prevent="notes.open(newer.version)"
    />
  </nav>
</template>

<style scoped>
.pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.newer {
  grid-column: 2;
  justify-self: end;
}

@media (max-width: 640px) {
  .pager {
    grid-template-columns: minmax(0, 1fr);
  }

  .newer {
    grid-column: 1;
    justify-self: stretch;
  }
}
</style>
