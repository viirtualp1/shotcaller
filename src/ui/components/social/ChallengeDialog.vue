<script setup lang="ts">
import { Swords } from '@lucide/vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { ModeId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useSettingsStore } from '../../stores/settings'
import ModePicker from '../modes/ModePicker.vue'

/** Picks the mode of a duel before the invite goes out; the mode picked last is offered first. */
const duel = useDuelStore()
const friends = useFriendsStore()
const settings = useSettingsStore()
const { t } = useGameText()

const mode = ref<ModeId>(settings.mode)

watch(
  () => duel.challenging,
  (id) => {
    if (id) {
      mode.value = settings.mode
    }
  },
)

const open = computed({
  get: () => duel.challenging !== null,
  set: (value: boolean) => {
    if (!value) {
      duel.challenging = null
    }
  },
})

useModal(open)

const name = computed(
  () => friends.friends.find((f) => f.id === duel.challenging)?.name || t('profile.defaultName'),
)

function send() {
  const id = duel.challenging
  if (id) {
    settings.mode = mode.value
    void duel.invite(id, mode.value)
  }
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet challenge" :aria-describedby="undefined">
        <DialogTitle class="hand title">{{ t('modes.challengeTitle') }}</DialogTitle>
        <p class="text">{{ t('modes.challengeText', { name }) }}</p>
        <ModePicker v-model="mode" />

        <div class="actions">
          <button type="button" class="btn ghost" @click="open = false">{{ t('newMatch.cancel') }}</button>

          <button type="button" class="btn primary" :disabled="duel.busy" @click="send">
            <Swords :size="16" /> {{ t('modes.send') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.challenge {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(420px, calc(100vw - 32px));
  z-index: 55;
}

.title {
  margin: 0;
  font-size: 34px;
  line-height: 1;
}

.text {
  margin: 0;
  color: var(--chalk-dim);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
