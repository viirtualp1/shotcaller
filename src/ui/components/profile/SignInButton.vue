<script setup lang="ts">
import { CloudUpload } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'

/** Sits next to the profile card on the start screen until the player signs in. */
const cloud = useCloudStore()
const { t } = useGameText()
</script>

<template>
  <button
    v-if="cloud.enabled && !cloud.signedIn"
    type="button"
    class="sign-in"
    :title="t('cloud.button.hint')"
    :aria-label="t('cloud.button.signIn')"
    @click="cloud.signInOpen = true"
  >
    <CloudUpload :size="20" />
    <span class="label">{{ t('cloud.button.signIn') }}</span>
  </button>
</template>

<style scoped>
.sign-in {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--coach-card-height, 66px);
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid rgba(244, 197, 91, 0.5);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--gold);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.15s ease-out both;
}

.sign-in:hover {
  border-color: rgba(244, 197, 91, 0.8);
  transform: translateY(-1px);
}

@media (max-width: 1199px) {
  .label {
    display: none;
  }

  .sign-in {
    width: 66px;
    padding: 0;
  }
}
</style>
