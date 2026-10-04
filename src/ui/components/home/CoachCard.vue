<script setup lang="ts">
import { LogIn, LogOut, Settings } from '@lucide/vue'
import { computed } from 'vue'
import { bestMode } from '@/domain/profile/Profile'
import { rankFor } from '@/domain/profile/progression'
import { useAccountPhoto } from '../../composables/useAccountPhoto'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useMenuStore } from '../../stores/menu'
import { useProfileStore } from '../../stores/profile'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankDropdown from '../profile/RankDropdown.vue'

/** The coach at the top of the desktop start screen: who they are, how far they got, and their account. */
const profile = useProfileStore()
const cloud = useCloudStore()
const menu = useMenuStore()
const photo = useAccountPhoto()
const text = useGameText()
const { t } = text

const progress = computed(() => `${Math.round((profile.level.into / profile.level.needed) * 100)}%`)

const rankShare = computed(() => {
  const { floor, next } = profile.rank

  if (next === null) {
    return 100
  }

  return ((profile.profile.rating - floor) / (next - floor)) * 100
})

/** The next star, or the next medal when the next star starts one. */
const nextStep = computed(() => {
  const { next, tier } = profile.rank

  if (next === null) {
    return
  }

  const points = text.mmr(next - profile.profile.rating)
  const upcoming = rankFor(next)

  if (upcoming.tier === tier) {
    return t('profile.toNextStar', { points })
  }

  return t('profile.toNextRank', {
    points,
    rank: t(`profile.ranks.${upcoming.tier}`),
  })
})

function signOut() {
  if (globalThis.confirm(t('cloud.signOutConfirm'))) {
    void cloud.signOut()
  }
}
</script>

<template>
  <section class="coach-card">
    <div class="who">
      <a href="/profile" class="identity" :aria-label="t('profile.title')" @click.prevent="profile.open()">
        <CoachAvatar
          :hero-id="profile.avatar"
          :level="profile.level.level"
          :size="56"
          :photo="photo.shown.value"
        />

        <span class="names">
          <strong class="name">{{ profile.profile.name || t('profile.defaultName') }}</strong>
          <span class="tier">{{ t(`profile.ranks.${profile.rank.tier}`) }}</span>
        </span>
      </a>

      <div class="rank">
        <div class="rank-text">
          <span class="rating">
            <span class="display-number">{{ text.number(profile.profile.rating) }}</span>
            <span class="unit">MMR</span>
          </span>

          <span v-if="profile.profile.rating > 0" class="best-mode">
            {{ t('profile.bestMode', { mode: t(`modes.${bestMode(profile.profile.ratings)}.name`) }) }}
          </span>

          <span class="bar"><span class="fill" :style="{ width: `${rankShare}%` }" /></span>

          <span v-if="nextStep" class="next-step">{{ nextStep }}</span>
        </div>

        <RankDropdown :rank="profile.rank" :size="44" />
      </div>
    </div>

    <div class="level">
      <span
        >{{ t('profile.level', { level: profile.level.level }) }} ·
        <span class="xp">{{ profile.level.into }} / {{ profile.level.needed }} XP</span></span
      >
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
}

.identity {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 14px;
  min-width: 0;
  color: var(--chalk);
  text-decoration: none;
}

.identity:hover .name {
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

.tier {
  overflow: hidden;
  color: var(--chalk-dim);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  max-width: 58%;
}

.rank-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 0;
}

.rating {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
  color: var(--gold);
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.unit {
  font-size: 0.5em;
  line-height: 1;
}

.best-mode {
  max-width: 100%;
  overflow: hidden;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar {
  position: relative;
  width: 100%;
  height: 6px;
  margin-top: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.1);
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #d49a2a, var(--gold));
}

.next-step {
  color: var(--chalk-dim);
  font-size: 11px;
  line-height: 1.3;
  text-align: right;
  white-space: nowrap;
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
