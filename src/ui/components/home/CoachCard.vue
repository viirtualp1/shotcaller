<script setup lang="ts">
import { LogIn, LogOut, Settings } from '@lucide/vue'
import { computed } from 'vue'
import { useAccountPhoto } from '../../composables/useAccountPhoto'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useMenuStore } from '../../stores/menu'
import { useProfileStore } from '../../stores/profile'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

/** The coach at the top of the desktop start screen: who they are, how far they got, and their account. */
const profile = useProfileStore()
const cloud = useCloudStore()
const menu = useMenuStore()
const photo = useAccountPhoto()
const { t } = useGameText()

const progress = computed(() => `${Math.round((profile.level.into / profile.level.needed) * 100)}%`)

function signOut() {
  if (globalThis.confirm(t('cloud.signOutConfirm'))) {
    void cloud.signOut()
  }
}
</script>

<template>
  <section class="coach-card">
    <a href="/profile" class="who" :aria-label="t('profile.title')" @click.prevent="profile.open()">
      <CoachAvatar
        :hero-id="profile.avatar"
        :level="profile.level.level"
        :size="56"
        :photo="photo.shown.value"
      />

      <span class="names">
        <strong class="name">{{ profile.profile.name || t('profile.defaultName') }}</strong>

        <span class="rank">{{ t(`profile.ranks.${profile.rank.tier}`) }}</span>
      </span>

      <RankMedal :tier="profile.rank.tier" :stars="profile.rank.stars" :size="44" />
    </a>

    <div class="level">
      <span
        >{{ t('profile.level', { level: profile.level.level }) }} ·
        <span class="xp">{{ profile.level.into }} / {{ profile.level.needed }} XP</span></span
      >

      <span class="mmr">{{ profile.profile.rating }} {{ t('coach.rating') }}</span>
    </div>

    <span class="track"><span :style="{ width: progress }" /></span>

    <div class="actions">
      <button type="button" class="action" @click="menu.settings = true">
        <Settings :size="15" /> {{ t('settings.title') }}
      </button>

      <button v-if="cloud.signedIn" type="button" class="action" @click="signOut">
        <LogOut :size="15" /> {{ t('cloud.signOut') }}
      </button>

      <button v-else-if="cloud.enabled" type="button" class="action primary" @click="cloud.signInOpen = true">
        <LogIn :size="15" /> {{ t('cloud.signIn') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.coach-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
}

.who {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  color: var(--chalk);
  text-decoration: none;
}

.who:hover .name {
  color: var(--gold);
}

.names {
  flex: 1;
  display: grid;
  gap: 2px;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.rank {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.level {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}

.xp {
  color: var(--chalk-faint);
}

.mmr {
  color: var(--gold);
  white-space: nowrap;
}

.track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.track span {
  display: block;
  height: 100%;
  background: var(--gold);
}

.actions {
  display: flex;
  gap: 8px;
}

.action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
  color: var(--chalk-dim);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.action:hover {
  border-color: rgba(244, 197, 91, 0.6);
  color: var(--chalk);
}

.action.primary {
  border-color: rgba(244, 197, 91, 0.6);
  background: rgba(244, 197, 91, 0.12);
  color: var(--gold);
}
</style>
