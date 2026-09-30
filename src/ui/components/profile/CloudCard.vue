<script setup lang="ts">
import { HardDrive, LogIn, LogOut, RotateCw } from '@lucide/vue'
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

/**
 * Before signing in the player's progress is theirs on this device only (the guest backup is our
 * business), so the card speaks of a local save and never shows cloud sync states.
 */
const local = computed(() => !cloud.signedIn)

const statusText = computed(() => {
  if (local.value) {
    return t('cloud.status.local')
  }

  if (cloud.status === 'synced' && cloud.savedAt !== null && now.value.getTime() - cloud.savedAt < 60_000) {
    return t('cloud.status.synced', { time: t('cloud.status.justNow') })
  }

  if (cloud.status === 'synced' && cloud.savedAt !== null) {
    return t('cloud.status.synced', {
      time: relativeTime(new Date(cloud.savedAt).toISOString(), settings.locale, now.value.getTime()),
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
  <section v-if="cloud.enabled" class="cloud" :data-status="local ? 'local' : cloud.status">
    <span class="icon">
      <HardDrive v-if="local" :size="20" />
      <component :is="CLOUD_ICONS[cloud.status]" v-else :size="20" :class="{ spin: cloud.busy }" />
    </span>

    <div class="text">
      <p class="heading">
        <strong>{{ t(local ? 'cloud.localTitle' : 'cloud.title') }}</strong>
        <span class="dot" aria-hidden="true">·</span>
        <span class="status">{{ statusText }}</span>
      </p>

      <span v-if="cloud.conflict" class="note warn">{{ t('cloud.conflict.pending') }}</span>
      <span v-else-if="local" class="note">{{ t('cloud.pitch') }}</span>
      <span v-else class="note">{{ t('cloud.signedIn', { email: maskedEmail }) }}</span>
    </div>

    <div class="actions">
      <button v-if="cloud.conflict" type="button" class="btn primary" @click="cloud.conflictDeferred = false">
        {{ t('cloud.conflict.choose') }}
      </button>

      <button v-else-if="!cloud.signedIn" type="button" class="btn primary" @click="cloud.signInOpen = true">
        <LogIn :size="15" /> {{ t('cloud.signIn') }}
      </button>

      <button v-else type="button" class="btn ghost" @click="signOut">
        <LogOut :size="15" /> {{ t('cloud.signOut') }}
      </button>

      <button
        v-if="!local && (cloud.status === 'error' || cloud.status === 'offline')"
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

.heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  margin: 0;
}

.dot {
  color: var(--chalk-faint);
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
