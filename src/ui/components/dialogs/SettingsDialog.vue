<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMenuStore } from '../../stores/menu'
import { useMatchStore } from '../../stores/match'
import SettingsFields from '../settings/SettingsFields.vue'

const menu = useMenuStore()
const match = useMatchStore()
const { t } = useGameText()

useModal(() => menu.settings)
</script>

<template>
  <DialogRoot v-model:open="menu.settings">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet settings" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ t('settings.title') }}</DialogTitle>

        <SettingsFields
          :language="!!match.view"
          :show-difficulty="!!match.view && !match.view.sandbox"
          :show-experiments="!!match.view"
        />

        <DialogClose class="btn primary block">{{ t('settings.close') }}</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.settings {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title {
  font-size: 38px;
  line-height: 1;
}
</style>
