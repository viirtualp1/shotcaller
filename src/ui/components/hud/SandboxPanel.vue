<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { SANDBOX } from '@/content/sandbox'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import CheckField from '../common/CheckField.vue'
import HudPanel from '../common/HudPanel.vue'

/** The training ground's controls: how many dummies stand on each lane, creep waves, and the way out. */
const store = useMatchStore()
const { t } = useGameText()

const counts = Array.from({ length: SANDBOX.maxDummies + 1 }, (_, n) => String(n))

const settings = computed(() => store.view?.sandbox ?? null)
const locked = computed(() => !store.isPlanning)

const dummies = computed({
  get: () => String(settings.value?.dummies ?? 0),
  set: (value: string | undefined) => {
    if (settings.value && value !== undefined) {
      store.setSandbox({
        ...settings.value,
        dummies: Number(value),
      })
    }
  },
})

const creeps = computed({
  get: () => settings.value?.creeps ?? false,
  set: (value: boolean) => {
    if (settings.value) {
      store.setSandbox({
        ...settings.value,
        creeps: value,
      })
    }
  },
})
</script>

<template>
  <HudPanel v-if="settings" :title="t('sandbox.title')" class="sandbox">
    <div class="field">
      <span id="sandbox-dummies" class="label">{{ t('sandbox.dummies') }}</span>

      <ToggleGroupRoot
        v-model="dummies"
        type="single"
        class="segmented-control"
        aria-labelledby="sandbox-dummies"
        :disabled="locked"
      >
        <ToggleGroupItem v-for="n in counts" :key="n" :value="n" class="segmented-option">
          {{ n }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </div>

    <CheckField v-model="creeps" :class="{ locked }">{{ t('sandbox.creeps') }}</CheckField>

    <p class="hint">{{ t('sandbox.hint') }}</p>

    <button type="button" class="btn ghost leave" @click="store.leaveToMenu()">
      <LogOut :size="15" /> {{ t('sandbox.leave') }}
    </button>
  </HudPanel>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.locked {
  pointer-events: none;
  opacity: 0.6;
}

.hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.leave {
  align-self: flex-start;
}
</style>
