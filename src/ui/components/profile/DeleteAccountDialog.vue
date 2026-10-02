<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
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
import { useModal } from '../../composables/useModal'
import { useCloudStore } from '../../stores/cloud'

const DATA = ['identity', 'progress', 'matches', 'social', 'privacy', 'support'] as const

const open = defineModel<boolean>('open', { required: true })

const cloud = useCloudStore()
const { t } = useGameText()
useModal(open)

async function remove() {
  if (await cloud.deleteAccount()) {
    open.value = false
    globalThis.location.reload()
  }
}
</script>

<template>
  <AlertDialogRoot :open="open" @update:open="!cloud.deleting && (open = $event)">
    <AlertDialogPortal>
      <AlertDialogOverlay class="overlay" />

      <AlertDialogContent class="sheet delete-account">
        <AlertDialogTitle class="hand title">{{ t('cloud.delete.title') }}</AlertDialogTitle>
        <AlertDialogDescription class="warning">{{ t('cloud.delete.warning') }}</AlertDialogDescription>

        <ul class="data">
          <li v-for="key in DATA" :key="key">{{ t(`cloud.delete.data.${key}`) }}</li>
        </ul>

        <p class="note">{{ t('cloud.delete.device') }}</p>
        <p v-if="cloud.deleteError" class="error" role="alert">{{ t('cloud.delete.error') }}</p>

        <div class="actions">
          <AlertDialogCancel class="btn" :disabled="cloud.deleting">{{
            t('profile.cancel')
          }}</AlertDialogCancel>

          <AlertDialogAction class="btn danger" :disabled="cloud.deleting" @click.prevent="remove">
            <Trash2 :size="15" /> {{ t(cloud.deleting ? 'cloud.delete.deleting' : 'cloud.delete.confirm') }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.delete-account {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(520px, calc(100vw - 32px));
}

.title {
  font-size: 38px;
  line-height: 1.1;
}

.warning,
.note {
  margin: 0;
  color: var(--chalk-dim);
}

.warning {
  font-weight: 700;
  color: var(--theirs);
}

.data {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.note {
  font-size: 12px;
}

.error {
  margin: 0;
  color: var(--theirs);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.danger {
  color: var(--theirs);
  border-color: color-mix(in srgb, var(--theirs) 55%, transparent);
}
</style>
