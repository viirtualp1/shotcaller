<script setup lang="ts">
import { ScrollText } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import { isFresh, LATEST_PATCH } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import PatchCard from './PatchCard.vue'

const notes = usePatchNotesStore()
const { t } = useGameText()
</script>

<template>
  <PatchCard
    class="latest"
    :href="`#/patches/${LATEST_PATCH.version}`"
    :icon="ScrollText"
    :eyebrow="`${t('patchNotes.latest')} · ${t('patchNotes.patch', { version: LATEST_PATCH.version })}`"
    :title="LATEST_PATCH.title"
    :action="t('patchNotes.read')"
    :fresh="isFresh(LATEST_PATCH)"
    @click.prevent="notes.open()"
  />
</template>
