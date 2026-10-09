<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import CoachPath from '../components/profile/CoachPath.vue'
import CareerPanel from '../components/profile/CareerPanel.vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import { useGameText } from '../composables/useGameText'
import { useUiZoom } from '../composables/useUiZoom'
import { useProfileStore } from '../stores/profile'

const profile = useProfileStore()
const { t } = useGameText()
const zoom = useUiZoom()
</script>

<template>
  <div class="career-page" :style="{ '--ui-zoom': zoom }">
    <a href="/" class="back btn ghost" @click.prevent="profile.close()">
      <ArrowLeft :size="16" /> {{ t('profile.back') }}
    </a>

    <main class="page">
      <ProfileHeader linked />
      <CareerPanel heading="h1" />
      <CoachPath />
    </main>
  </div>
</template>

<style scoped>
.career-page {
  position: relative;
  min-height: calc((100dvh - var(--mobile-tabs, 0px) - env(safe-area-inset-bottom, 0px)) / var(--ui-zoom));
  zoom: var(--ui-zoom);
}

.back {
  position: absolute;
  top: 12px;
  left: 12px;
  border-radius: var(--radius);
}

.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
}

.page :deep(.header) {
  padding-block: 12px;
}

@media (max-width: 860px) {
  .back {
    position: relative;
    top: 0;
    left: 0;
    margin: calc(12px + env(safe-area-inset-top, 0px)) 16px 0;
  }

  .page {
    padding-top: 12px;
    padding-inline: 16px;
  }
}
</style>
