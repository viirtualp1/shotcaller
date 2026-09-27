<script setup lang="ts">
import { Swords } from 'lucide-vue-next'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'

const match = useMatchStore()
const menu = useMenuStore()
const { t } = useGameText()
</script>

<template>
  <AlertDialogRoot v-model:open="menu.confirmFight">
    <AlertDialogPortal>
      <AlertDialogOverlay class="overlay" />

      <AlertDialogContent class="sheet confirm">
        <AlertDialogTitle class="title hand">{{ t('confirmFight.title') }}</AlertDialogTitle>
        <AlertDialogDescription class="text">{{ t('confirmFight.text') }}</AlertDialogDescription>

        <div class="actions">
          <AlertDialogCancel class="btn ghost">{{ t('confirmFight.cancel') }}</AlertDialogCancel>

          <AlertDialogAction class="btn primary" @click="match.startBattle()">
            <Swords :size="16" />
            {{ t('confirmFight.confirm') }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(400px, calc(100vw - 32px));
}

.title {
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

.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
