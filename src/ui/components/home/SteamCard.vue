<script setup lang="ts">
import { IN_DESKTOP } from '@/application/desktop'
import { useGameText } from '../../composables/useGameText'
import { usePatchNotesStore } from '../../stores/patchNotes'
import SteamIcon from '../common/SteamIcon.vue'

/** The patch that announces the Steam version; the card opens it until the store page exists. */
const STEAM_PATCH = '9.2'

/** The upcoming Steam release, beside the Discord card. The Steam version itself does not advertise Steam. */
const notes = usePatchNotesStore()
const { t } = useGameText()
</script>

<template>
  <a
    v-if="!IN_DESKTOP"
    :href="`/patches/${STEAM_PATCH}/`"
    class="steam"
    @click.prevent="notes.open(STEAM_PATCH)"
  >
    <SteamIcon :size="26" />

    <span>
      <b>{{ t('start.home.steam.title') }}</b>
      <small>{{ t('start.home.steam.text') }}</small>
    </span>
  </a>
</template>

<style scoped>
.steam {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(108, 196, 255, 0.5);
  border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(108, 196, 255, 0.16), rgba(23, 39, 52, 0.4));
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.steam:hover {
  border-color: var(--ours);
  background: linear-gradient(135deg, rgba(108, 196, 255, 0.26), rgba(23, 39, 52, 0.5));
}

.steam svg {
  flex: none;
  color: #bfe6ff;
}

b {
  display: block;
  font-size: 16px;
}

small {
  display: block;
  margin-top: 2px;
  color: var(--chalk-dim);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 860px) {
  .steam {
    align-items: center;
  }

  small {
    display: none;
  }
}
</style>
