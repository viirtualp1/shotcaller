<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { EARLIER_SUMMARY, PATCH_NOTES, releaseOf, type PatchNote } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import PatchCard from './PatchCard.vue'

/**
 * The patches either side of this one. The latest points back with a summary: a fix to the release it builds on,
 * a release to the few releases before it.
 */
const props = defineProps<{ patch: PatchNote }>()

const notes = usePatchNotesStore()
const { t } = useGameText()

const index = computed(() => PATCH_NOTES.indexOf(props.patch))
const older = computed(() => PATCH_NOTES[index.value + 1] ?? null)
const newer = computed(() => (index.value > 0 ? PATCH_NOTES[index.value - 1]! : null))

const back = computed(() => {
  if (!older.value) {
    return null
  }

  if (index.value > 0) {
    return {
      patch: older.value,
      eyebrow: t('patchNotes.older'),
      title: older.value.title,
    }
  }

  const release = releaseOf(props.patch)

  return release
    ? {
        patch: release,
        eyebrow: t('patchNotes.release', { version: release.version }),
        title: release.title,
      }
    : {
        patch: older.value,
        eyebrow: t('patchNotes.earlier'),
        title: EARLIER_SUMMARY,
      }
})
</script>

<template>
  <nav v-if="older || newer" class="pager" :aria-label="t('patchNotes.choose')">
    <PatchCard
      v-if="back"
      class="older"
      :href="`#/patches/${back.patch.version}`"
      :icon="ChevronLeft"
      :eyebrow="back.eyebrow"
      :title="back.title"
      :action="t('patchNotes.openPatch', { version: back.patch.version })"
      @click.prevent="notes.open(back.patch.version)"
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
