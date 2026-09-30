<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import CareerPanel from '../components/profile/CareerPanel.vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import { useGameText } from '../composables/useGameText'
import { useProfileStore } from '../stores/profile'

const profile = useProfileStore()
const { t } = useGameText()
</script>

<template>
  <div class="career-page">
    <header class="topbar">
      <nav class="bar" :aria-label="t('career.title')">
        <a href="./" class="btn ghost" @click.prevent="profile.close()">
          <ArrowLeft :size="16" /> {{ t('profile.back') }}
        </a>
      </nav>
    </header>

    <main class="page">
      <ProfileHeader linked />
      <CareerPanel heading="h1" />
    </main>
  </div>
</template>

<style scoped>
.career-page {
  min-height: 100%;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(19, 27, 24, 0.86);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--edge);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 1160px;
  min-height: 64px;
  margin: 0 auto;
  padding: 10px 20px;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 20px calc(80px + env(safe-area-inset-bottom, 0px));
}

@media (max-width: 720px) {
  .bar,
  .page {
    padding-inline: 16px;
  }
}
</style>
