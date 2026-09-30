<script setup lang="ts">
import { Play } from '@lucide/vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, watch } from 'vue'
import { TUTORIAL_MODE } from '@/content/modes'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'
import { useSettingsStore } from '../../stores/settings'
import { useTutorial } from '../../tutorial/useTutorial'
import CheckField from '../common/CheckField.vue'
import ModePicker from '../modes/ModePicker.vue'
import SettingsFields from '../settings/SettingsFields.vue'

const menu = useMenuStore()
const store = useMatchStore()
const settings = useSettingsStore()
const tour = useTutorial()
const { t } = useGameText()

useModal(() => menu.newMatch)

/** Offered until the tutorial is done, and only on its mode: another mode picked means the coach knows the way. */
const withTutorial = computed({
  get: () => settings.tutorialWanted && settings.mode === TUTORIAL_MODE,
  set: (value: boolean) => {
    settings.tutorialWanted = value

    if (value) {
      settings.mode = TUTORIAL_MODE
    }
  },
})

watch(
  () => menu.newMatch,
  (open) => {
    if (open) {
      settings.tutorialWanted = !tour.completed.value
    }
  },
)

function start() {
  menu.newMatch = false
  menu.gameMenu = false
  store.newMatch(settings.mode)

  if (withTutorial.value) {
    menu.requestTutorial()
  }
}
</script>

<template>
  <DialogRoot v-model:open="menu.newMatch">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet new-match" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ t('newMatch.title') }}</DialogTitle>

        <div class="mode">
          <ModePicker v-model="settings.mode" />
          <p v-if="withTutorial" class="note">{{ t('modes.tutorialNote') }}</p>
        </div>

        <SettingsFields :language="false" :sound="false">
          <template #beforeExperiments>
            <CheckField v-model="withTutorial">{{ t('newMatch.tutorial') }}</CheckField>
          </template>
        </SettingsFields>

        <div class="actions">
          <button type="button" class="btn primary block big" @click="start">
            <Play :size="18" /> {{ t('newMatch.start') }}
          </button>

          <button type="button" class="btn ghost block" @click="menu.newMatch = false">
            {{ t('newMatch.cancel') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.new-match {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title {
  font-size: 40px;
  line-height: 1;
}

.mode {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
