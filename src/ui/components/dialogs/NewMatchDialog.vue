<script setup lang="ts">
import { Check, Play } from 'lucide-vue-next'
import {
  CheckboxIndicator,
  CheckboxRoot,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { ref, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'
import { useTutorial } from '../../tutorial/useTutorial'
import SettingsFields from '../settings/SettingsFields.vue'

const menu = useMenuStore()
const store = useMatchStore()
const tour = useTutorial()
const { t } = useGameText()
const withTutorial = ref(!tour.completed.value)

watch(
  () => menu.newMatch,
  (open) => {
    if (open) {
      withTutorial.value = !tour.completed.value
    }
  },
)

function start() {
  menu.newMatch = false
  menu.gameMenu = false
  store.newMatch()

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
        <SettingsFields />

        <label class="tutorial">
          <CheckboxRoot v-model="withTutorial" class="checkbox">
            <CheckboxIndicator class="tick"><Check :size="15" :stroke-width="3" /></CheckboxIndicator>
          </CheckboxRoot>

          <span>{{ t('newMatch.tutorial') }}</span>
        </label>

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

.tutorial {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
}

.checkbox {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 6px;
  border: 1.5px solid var(--edge-strong);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.checkbox[data-state='checked'] {
  background: var(--gold);
  border-color: var(--gold);
}

.tick {
  display: grid;
  place-items: center;
  color: var(--ink);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
