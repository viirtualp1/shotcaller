<script setup lang="ts">
import { LogOut, Mail, RotateCw } from 'lucide-vue-next'
import { useIntervalFn, useNow } from '@vueuse/core'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useSettingsStore } from '../../stores/settings'
import { CLOUD_ICONS, maskEmail } from './cloudStatus'
import { relativeTime } from './format'

const cloud = useCloudStore()
const settings = useSettingsStore()
const { t } = useGameText()
/** Keeps "saved 5 minutes ago" moving while the page stays open. */
const now = useNow({ scheduler: (tick) => useIntervalFn(tick, 30_000) })

const statusText = computed(() => {
  if (cloud.status === 'synced' && cloud.syncedAt !== null && now.value.getTime() - cloud.syncedAt < 60_000) {
    return t('cloud.status.synced', { time: t('cloud.status.justNow') })
  }

  if (cloud.status === 'synced' && cloud.syncedAt !== null) {
    return t('cloud.status.synced', {
      time: relativeTime(new Date(cloud.syncedAt).toISOString(), settings.locale, now.value.getTime()),
    })
  }

  return cloud.status === 'off' ? '' : t(`cloud.status.${cloud.status}`)
})

const maskedEmail = computed(() => maskEmail(cloud.account?.email ?? ''))

function signOut() {
  if (globalThis.confirm(t('cloud.signOutConfirm'))) {
    void cloud.signOut()
  }
}
</script>

<template>
  <section v-if="cloud.enabled" class="cloud" :data-status="cloud.status">
    <span class="icon">
      <component :is="CLOUD_ICONS[cloud.status]" :size="20" :class="{ spin: cloud.busy }" />
    </span>

    <div class="text">
      <strong>{{ t('cloud.title') }}</strong>
      <span class="status">{{ statusText }}</span>
      <span v-if="cloud.conflict" class="note warn">{{ t('cloud.conflict.pending') }}</span>
      <span v-else-if="cloud.signedIn" class="note">{{ t('cloud.signedIn', { email: maskedEmail }) }}</span>
      <span v-else-if="cloud.account" class="note">{{ t('cloud.guest') }}</span>
      <span v-else class="note">{{ t('cloud.pitch') }}</span>
    </div>

    <div class="actions">
      <button v-if="cloud.conflict" type="button" class="btn primary" @click="cloud.conflictDeferred = false">
        {{ t('cloud.conflict.choose') }}
      </button>

      <button v-else-if="!cloud.signedIn" type="button" class="btn primary" @click="cloud.signInOpen = true">
        <Mail :size="15" /> {{ t('cloud.signInEmail') }}
      </button>

      <button v-else type="button" class="btn ghost" @click="signOut">
        <LogOut :size="15" /> {{ t('cloud.signOut') }}
      </button>

      <button
        v-if="cloud.status === 'error' || cloud.status === 'offline'"
        type="button"
        class="btn ghost"
        @click="cloud.syncNow()"
      >
        <RotateCw :size="15" /> {{ t('cloud.retry') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.cloud {
  --tone: var(--chalk-dim);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid var(--edge);
  background: rgba(17, 24, 21, 0.86);
}

.cloud[data-status='synced'] {
  --tone: var(--heal);
}

.cloud[data-status='error'],
.cloud[data-status='offline'] {
  --tone: var(--theirs);
}

.icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
}

.spin {
  animation: spin 1s linear infinite;
}

.text {
  display: flex;
  flex: 1 1 260px;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.status {
  font-size: 13px;
  color: var(--tone);
}

.note {
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.note.warn {
  color: var(--gold);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
