<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { usePrivacyStore } from '../../stores/privacy'
import CheckField from '../common/CheckField.vue'

const privacy = usePrivacyStore()
const { t } = useGameText()

const telemetry = ref(false)

const open = computed({
  get: () => privacy.open,
  set: (value) => {
    if (!value) {
      privacy.dismiss()
    }
  },
})

watch(
  () => privacy.open,
  (value) => {
    if (value) {
      telemetry.value = Boolean(privacy.current && privacy.choices?.telemetry)
    }
  },
)

useModal(open)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay menu-overlay" />

      <DialogContent
        class="sheet telemetry"
        @escape-key-down="privacy.busy && $event.preventDefault()"
        @pointer-down-outside="privacy.busy && $event.preventDefault()"
      >
        <DialogTitle class="hand title">{{ t('telemetry.title') }}</DialogTitle>
        <DialogDescription class="intro">{{ t('telemetry.intro') }}</DialogDescription>

        <div class="explanation">
          <details>
            <summary>{{ t('telemetry.dataTitle') }}</summary>
            <p>{{ t('telemetry.data') }}</p>
          </details>

          <p>{{ t('telemetry.identity') }}</p>

          <p>
            {{ t('telemetry.provider') }}
            <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">{{
              t('telemetry.providerLink')
            }}</a>
          </p>

          <p>{{ t('telemetry.choice') }}</p>
          <p>{{ t('telemetry.retention') }}</p>
          <p>{{ t('telemetry.cloud') }}</p>
        </div>

        <fieldset :disabled="privacy.busy">
          <CheckField v-model="telemetry">{{ t('telemetry.agree') }}</CheckField>
        </fieldset>

        <p v-if="privacy.error" class="error" role="alert">{{ t('telemetry.error') }}</p>

        <div class="actions">
          <button class="btn block" type="button" :disabled="privacy.busy" @click="privacy.save(false)">
            {{ t('telemetry.decline') }}
          </button>

          <button class="btn block" type="button" :disabled="privacy.busy" @click="privacy.save(telemetry)">
            {{ privacy.busy ? t('telemetry.saving') : t('telemetry.save') }}
          </button>
        </div>

        <button class="btn ghost block" type="button" :disabled="privacy.busy" @click="privacy.dismiss()">
          {{ t('telemetry.later') }}
        </button>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.telemetry {
  width: min(600px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
.title {
  font-size: 34px;
  line-height: 1;
}
.intro {
  margin: 0;
}
.explanation {
  color: var(--chalk-dim);
  font-size: 13px;
  line-height: 1.6;
}
.explanation p {
  margin: 0 0 10px;
}
details {
  margin-bottom: 10px;
}
summary {
  color: var(--chalk);
  cursor: pointer;
  font-weight: 600;
}
details p {
  margin-top: 10px;
}
fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}
.actions {
  display: flex;
  gap: 10px;
}
.actions button {
  flex: 1;
}
.error {
  color: var(--theirs);
  margin: 0;
}
@media (max-width: 420px) {
  .actions {
    flex-direction: column;
  }
}
</style>
