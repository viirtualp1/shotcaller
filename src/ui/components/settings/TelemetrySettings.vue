<script setup lang="ts">
import { ChartNoAxesColumn } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { usePrivacyStore } from '../../stores/privacy'
import { useMenuStore } from '../../stores/menu'

const props = defineProps<{ iconOnly?: boolean }>()

const privacy = usePrivacyStore()
const cloud = useCloudStore()
const menu = useMenuStore()
const { t } = useGameText()

const status = computed(() => {
  if (privacy.error) {
    return 'telemetry.unavailable'
  }

  if (!privacy.loaded) {
    return 'telemetry.loading'
  }

  const active = privacy.current && privacy.choices?.telemetry
  if (props.iconOnly) {
    return active ? 'telemetry.enabled' : 'telemetry.disabled'
  }

  return active ? 'telemetry.on' : 'telemetry.off'
})

const label = computed(() => `${t('telemetry.settings')} · ${t(status.value)}`)

function edit() {
  menu.settings = false
  menu.newMatch = false

  privacy.edit()
}
</script>

<template>
  <button
    v-if="privacy.enabled && cloud.signedIn && iconOnly"
    class="telemetry-settings icon-only"
    type="button"
    :title="label"
    :aria-label="label"
    @click="edit"
  >
    <ChartNoAxesColumn :size="20" aria-hidden="true" />
  </button>

  <section v-else-if="privacy.enabled && cloud.signedIn" class="telemetry-settings">
    <strong>{{ t('telemetry.settings') }}</strong>

    <span class="status">{{ t(status) }}</span>

    <button class="btn block" type="button" @click="edit">{{ t('telemetry.manage') }}</button>
  </section>
</template>

<style scoped>
.telemetry-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status {
  color: var(--chalk-dim);
  font-size: 13px;
}

.icon-only {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.1);
  color: var(--gold);
  font: inherit;
  cursor: pointer;
}

.icon-only:hover {
  background: rgba(244, 197, 91, 0.18);
}

.icon-only:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
</style>
