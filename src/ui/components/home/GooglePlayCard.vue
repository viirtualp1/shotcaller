<script setup lang="ts">
import { IN_ANDROID_APP } from '@/application/android'
import { IN_DESKTOP } from '@/application/desktop'
import { useGameText } from '../../composables/useGameText'
import { usePatchNotesStore } from '../../stores/patchNotes'
import GooglePlayIcon from '../common/GooglePlayIcon.vue'

/** The patch that announces the Android version; the card opens it until the store page exists. */
const ANNOUNCEMENT_PATCH = '9.2'

/** The upcoming Google Play release, beside the Steam card. Neither app advertises it. */
const notes = usePatchNotesStore()
const { t } = useGameText()
</script>

<template>
  <a
    v-if="!IN_ANDROID_APP && !IN_DESKTOP"
    :href="`/patches/${ANNOUNCEMENT_PATCH}/`"
    :aria-label="t('start.home.googlePlay.title')"
    class="google-play"
    @click.prevent="notes.open(ANNOUNCEMENT_PATCH)"
  >
    <GooglePlayIcon :size="24" />

    <b class="mobile-label" aria-hidden="true">Soon</b>

    <b class="desktop-copy">{{ t('start.home.googlePlay.title') }}</b>
  </a>
</template>

<style scoped>
.google-play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 12px;
  border: 1px solid rgba(127, 224, 180, 0.5);
  border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(127, 224, 180, 0.14), rgba(23, 44, 36, 0.4));
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.google-play:hover {
  border-color: var(--heal);
  background: linear-gradient(135deg, rgba(127, 224, 180, 0.24), rgba(23, 44, 36, 0.5));
}

.google-play svg {
  flex: none;
  color: #c4f2dc;
}

b {
  display: block;
  font-size: 16px;
  line-height: 1.2;
  text-align: center;
}

.mobile-label {
  display: none;
}

@media (max-width: 860px) {
  .google-play {
    gap: 6px;
    padding: 12px 8px;
  }

  .google-play svg {
    width: 20px;
    height: 20px;
  }

  .desktop-copy {
    display: none;
  }

  .mobile-label {
    display: block;
    font-size: 14px;
    white-space: nowrap;
  }
}
</style>
