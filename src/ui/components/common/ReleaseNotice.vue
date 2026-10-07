<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { IN_DESKTOP } from '@/application/desktop'
import { IN_DISCORD } from '@/application/discord'
import { useGameText } from '../../composables/useGameText'
import { useGameUpdateStore } from '../../stores/gameUpdate'
import { useMatchStore } from '../../stores/match'

const props = defineProps<{ requestedVersion?: string }>()

const updates = useGameUpdateStore()
const match = useMatchStore()
const { t } = useGameText()
</script>

<template>
  <aside
    v-if="props.requestedVersion || (!IN_DESKTOP && !IN_DISCORD && (updates.outdated || updates.needRefresh))"
    class="release-notice"
    role="status"
    :aria-busy="updates.checking || updates.requesting || updates.updating"
  >
    <strong>{{
      t(updates.outdated || updates.needRefresh ? 'pwa.updateTitle' : 'pwa.mayNeedUpdate')
    }}</strong>

    <p v-if="props.requestedVersion">{{ t('pwa.patchUnavailable', { version: props.requestedVersion }) }}</p>

    <p v-if="updates.outdated">
      {{ t('pwa.versions', { current: updates.currentVersion, latest: updates.latestVersion }) }}
    </p>

    <p v-if="match.isDuel" class="hint">{{ t('pwa.duelHint') }}</p>
    <p v-else-if="updates.failed" class="hint">{{ t('pwa.updateFailed') }}</p>
    <p v-else-if="updates.notReady" class="hint">{{ t('pwa.notReady') }}</p>

    <button
      v-if="!IN_DESKTOP && !IN_DISCORD"
      type="button"
      class="btn primary"
      :disabled="match.isDuel || updates.checking || updates.requesting || updates.updating"
      @click="updates.updateGame"
    >
      <RefreshCw
        :size="15"
        :class="{ spinning: updates.checking || updates.requesting || updates.updating }"
      />
      {{
        updates.updating
          ? t('pwa.updating')
          : updates.checking || updates.requesting
            ? t('pwa.checking')
            : updates.needRefresh
              ? t('pwa.update')
              : t('pwa.checkUpdate')
      }}
    </button>
  </aside>
</template>

<style scoped>
.release-notice {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(244, 197, 91, 0.45);
  border-radius: var(--radius);
  background: linear-gradient(120deg, rgba(244, 197, 91, 0.12), rgba(244, 197, 91, 0.03));
  color: var(--chalk);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  overflow-wrap: anywhere;
}

strong {
  color: var(--gold);
  font-size: 15px;
}

p {
  margin: 0;
}

.hint {
  color: var(--chalk-dim);
}

.btn {
  justify-self: start;
  max-width: 100%;
  min-height: 36px;
  font-size: 13px;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}
</style>
