<script setup lang="ts">
import { CloudAlert, CloudCheck, CloudOff } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useProfileStore } from '../../stores/profile'
import CoachAvatar from './CoachAvatar.vue'
import RankMedal from './RankMedal.vue'

const profile = useProfileStore()
const cloud = useCloudStore()
const { t } = useGameText()
</script>

<template>
  <a href="#/profile" class="chip" :aria-label="t('profile.title')" @click.prevent="profile.open()">
    <CoachAvatar :hero-id="profile.avatar" :level="profile.level.level" :size="42" />

    <span class="who">
      <strong class="name">{{ profile.profile.name || t('profile.defaultName') }}</strong>

      <span class="rank">
        {{ t(`profile.ranks.${profile.rank.tier}`) }}

        <span
          v-if="cloud.conflict || cloud.status === 'error'"
          class="cloud warn"
          :title="t('cloud.status.error')"
        >
          <CloudAlert :size="13" />
        </span>

        <span v-else-if="cloud.status === 'offline'" class="cloud warn" :title="t('cloud.status.offline')">
          <CloudOff :size="13" />
        </span>

        <span v-else-if="cloud.status === 'synced'" class="cloud" :title="t('cloud.title')">
          <CloudCheck :size="13" />
        </span>
      </span>
    </span>

    <RankMedal :tier="profile.rank.tier" :stars="profile.rank.stars" :size="38" />
  </a>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  padding: 10px 16px 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--edge-strong);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.1s ease-out both;
}

.chip:hover {
  border-color: rgba(244, 197, 91, 0.6);
  transform: translateY(-1px);
}

.who {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-right: 4px;
}

.name {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cloud {
  display: inline-flex;
  vertical-align: -2px;
  margin-left: 4px;
  color: var(--heal);
}

.cloud.warn {
  color: var(--gold);
}

.rank {
  font-size: 12px;
  font-weight: 600;
  color: var(--chalk-dim);
}
</style>
