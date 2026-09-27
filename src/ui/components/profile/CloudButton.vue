<script setup lang="ts">
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useProfileStore } from '../../stores/profile'
import { CLOUD_ICONS, maskEmail } from './cloudStatus'

/** Sits next to the profile card on the start screen: sign in from there, or see that progress is saved. */
const cloud = useCloudStore()
const profile = useProfileStore()
const { t } = useGameText()

const statusLabel = computed(() =>
  t('cloud.button.status', {
    status:
      cloud.status === 'synced' ? maskEmail(cloud.account?.email ?? '') : t(`cloud.status.${cloud.status}`),
  }),
)
</script>

<template>
  <template v-if="cloud.enabled">
    <button
      v-if="!cloud.signedIn"
      type="button"
      class="cloud-button sign-in"
      :title="t('cloud.button.hint')"
      @click="cloud.signInOpen = true"
    >
      <component :is="CLOUD_ICONS.local" :size="20" />
      <span>{{ t('cloud.button.signIn') }}</span>
    </button>

    <a
      v-else
      href="#/profile"
      class="cloud-button status"
      :data-status="cloud.status"
      :title="statusLabel"
      :aria-label="statusLabel"
      @click.prevent="profile.open()"
    >
      <component :is="CLOUD_ICONS[cloud.status]" :size="22" :class="{ spin: cloud.busy }" />
    </a>
  </template>
</template>

<style scoped>
.cloud-button {
  --tone: var(--chalk-dim);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 66px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid var(--edge-strong);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--tone);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.15s ease-out both;
}

.cloud-button:hover {
  border-color: rgba(244, 197, 91, 0.6);
  transform: translateY(-1px);
}

.sign-in {
  --tone: var(--gold);
  border-color: rgba(244, 197, 91, 0.5);
}

.status {
  width: 66px;
  padding: 0;
}

.status[data-status='synced'] {
  --tone: var(--heal);
}

.status[data-status='error'],
.status[data-status='offline'] {
  --tone: var(--theirs);
}

.spin {
  animation: spin 1s linear infinite;
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
