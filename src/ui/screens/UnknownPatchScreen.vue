<script setup lang="ts">
import { ArrowLeft, ScrollText } from '@lucide/vue'
import ReleaseNotice from '../components/common/ReleaseNotice.vue'
import { useGameText } from '../composables/useGameText'
import { LATEST_PATCH } from '../patchNotes/notes'
import { usePatchNotesStore } from '../stores/patchNotes'

const notes = usePatchNotesStore()
const { t } = useGameText()
</script>

<template>
  <main class="unknown-patch">
    <a href="/" class="btn back" @click.prevent="notes.close()">
      <ArrowLeft :size="16" /> {{ t('patchNotes.back') }}
    </a>

    <ReleaseNotice :requested-version="notes.requestedVersion ?? undefined" />
    <h1 class="hand">{{ notes.requestedVersion }}</h1>

    <a
      :href="`/patches/${LATEST_PATCH.version}/`"
      class="btn known-patch"
      @click.prevent="notes.select(LATEST_PATCH.version)"
    >
      <ScrollText :size="16" />
      {{ t('pwa.readInstalledPatch', { version: LATEST_PATCH.version }) }}
    </a>
  </main>
</template>

<style scoped>
.unknown-patch {
  display: grid;
  gap: 24px;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.back,
.known-patch {
  justify-self: start;
  max-width: 100%;
  white-space: normal;
}

h1 {
  margin: 0;
  color: var(--gold);
  font-size: clamp(56px, 12vw, 96px);
  overflow-wrap: anywhere;
}
</style>
