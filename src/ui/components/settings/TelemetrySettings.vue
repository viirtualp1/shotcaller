<script setup lang="ts">
import { ArrowUpRight, ChartNoAxesColumn } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { usePrivacyStore } from '../../stores/privacy'
import { useMenuStore } from '../../stores/menu'

const props = defineProps<{ compact?: boolean }>()

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
  if (props.compact) {
    return active ? 'telemetry.enabled' : 'telemetry.disabled'
  }

  return active ? 'telemetry.on' : 'telemetry.off'
})

function edit() {
  menu.settings = false
  menu.newMatch = false

  privacy.edit()
}
</script>

<template>
  <button
    v-if="privacy.enabled && cloud.signedIn && compact"
    class="telemetry-settings compact"
    type="button"
    @click="edit"
  >
    <ChartNoAxesColumn class="icon" :size="20" aria-hidden="true" />

    <span class="text">
      <strong>{{ t('telemetry.shortTitle') }}</strong>
      <span class="status">{{ t(status) }}</span>
    </span>

    <ArrowUpRight class="arrow" :size="16" aria-hidden="true" />
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

.compact {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(17, 24, 21, 0.86);
  color: var(--chalk);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.compact:hover {
  border-color: var(--edge-strong);
  background: rgba(24, 34, 29, 0.95);
}

.compact:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.icon {
  flex: none;
  box-sizing: content-box;
  padding: 10px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--gold) 14%, transparent);
  color: var(--gold);
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.compact strong {
  font-size: 13px;
}

.arrow {
  flex: none;
  color: var(--chalk-faint);
}
</style>
