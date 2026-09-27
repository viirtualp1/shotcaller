<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const store = useMatchStore()
const { t } = useGameText()

const result = computed(() => store.view?.result ?? null)
const open = computed(() => store.phase === 'finished' && result.value !== null)
const verdict = computed(() =>
  result.value?.winner === 0 ? 'win' : result.value?.winner === 1 ? 'loss' : 'draw',
)
const explanation = computed(() => {
  const view = store.view
  if (!view || !result.value) return ''
  if (result.value.reason === 'roundLimit') return t('result.roundLimit', { max: view.maxRounds })
  return t(verdict.value === 'win' ? 'result.throneWin' : 'result.throneLoss', { round: view.round })
})
</script>

<template>
  <DialogRoot :open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="sheet result" @escape-key-down.prevent @pointer-down-outside.prevent>
        <DialogTitle class="title hand" :data-verdict="verdict">{{ t(`result.${verdict}`) }}</DialogTitle>
        <DialogDescription class="text">{{ explanation }}</DialogDescription>
        <div class="actions">
          <button type="button" class="btn primary" @click="store.newMatch()">{{ t('result.again') }}</button>
          <button type="button" class="btn ghost" @click="store.leaveToMenu()">{{ t('result.menu') }}</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.result {
  text-align: center;
  width: min(420px, calc(100vw - 32px));
}

.title {
  font-size: 64px;
  line-height: 1;
}

.title[data-verdict='win'] {
  color: var(--gold);
}

.title[data-verdict='loss'] {
  color: var(--theirs);
}

.text {
  margin: 10px 0 20px;
  color: var(--chalk-dim);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
