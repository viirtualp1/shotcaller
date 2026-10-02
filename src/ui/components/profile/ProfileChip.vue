<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import { useAccountPhoto } from '../../composables/useAccountPhoto'
import CoachAvatar from './CoachAvatar.vue'
import RankMedal from './RankMedal.vue'

const profile = useProfileStore()
const photo = useAccountPhoto()
const { t } = useGameText()
const narrow = useMediaQuery('(max-width: 360px)')
</script>

<template>
  <a href="/profile" class="chip" :aria-label="t('profile.title')" @click.prevent="profile.open()">
    <CoachAvatar
      :hero-id="profile.avatar"
      :level="profile.level.level"
      :size="narrow ? 34 : 42"
      :photo="photo.shown.value"
    />

    <span class="who">
      <strong class="name">{{ profile.profile.name || t('profile.defaultName') }}</strong>

      <span class="rank">{{ t(`profile.ranks.${profile.rank.tier}`) }}</span>
    </span>

    <RankMedal :tier="profile.rank.tier" :stars="profile.rank.stars" :size="narrow ? 30 : 38" />
  </a>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  min-height: var(--coach-card-height, 66px);
  padding: 10px 20px 12px;
  border-radius: var(--radius);
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

.rank {
  font-size: 12px;
  font-weight: 600;
  color: var(--chalk-dim);
}
</style>
