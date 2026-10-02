<script setup lang="ts">
import { ArrowLeft, ChevronDown, LoaderCircle, Trophy } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { HERO_IDS, MODE_IDS } from '@/content/ids'
import { rankFor } from '@/domain/profile/progression'
import ModeMap from '../components/modes/ModeMap.vue'
import CoachAvatar from '../components/profile/CoachAvatar.vue'
import RankMedal from '../components/profile/RankMedal.vue'
import { useGameText } from '../composables/useGameText'
import { useCloudStore } from '../stores/cloud'
import { useLeaderboardStore } from '../stores/leaderboard'

const PAGE_SIZE = 25

const leaderboard = useLeaderboardStore()
const cloud = useCloudStore()
const text = useGameText()
const { t } = text

const shown = ref(PAGE_SIZE)

const rows = computed(() => leaderboard.rows.slice(0, shown.value))
const ownId = computed(() => cloud.account?.id)

function heroOf(avatar: string | null) {
  return HERO_IDS.find((id) => id === avatar) ?? 'spearman'
}

watch(
  () => leaderboard.mode,
  () => {
    shown.value = PAGE_SIZE
  },
)
</script>

<template>
  <div class="leaderboard-page">
    <header class="topbar">
      <div class="bar">
        <a href="/" class="btn ghost" @click.prevent="leaderboard.close()"
          ><ArrowLeft :size="16" /> {{ t('profile.back') }}</a
        >
      </div>
    </header>

    <main class="page">
      <header class="heading">
        <span class="eyebrow"><Trophy :size="15" /> {{ t('leaderboard.top') }}</span>
        <h1 class="hand">{{ t('leaderboard.title') }}</h1>
      </header>

      <div class="modes" role="group" :aria-label="t('modes.title')">
        <button
          v-for="mode in MODE_IDS"
          :key="mode"
          type="button"
          :aria-pressed="leaderboard.mode === mode"
          :class="{ selected: leaderboard.mode === mode }"
          @click="leaderboard.select(mode)"
        >
          <ModeMap :mode="mode" :size="28" aria-hidden="true" /> {{ t(`modes.${mode}.name`) }}
        </button>
      </div>

      <p v-if="!cloud.enabled" class="state">{{ t('leaderboard.off') }}</p>

      <div v-else-if="leaderboard.loading" class="state" role="status">
        <LoaderCircle :size="22" class="spin" /> {{ t('leaderboard.loading') }}
      </div>

      <div v-else-if="leaderboard.error" class="state" role="alert">
        <p>{{ t('leaderboard.error') }}</p>
        <button type="button" class="btn" @click="leaderboard.refresh()">{{ t('friends.retry') }}</button>
      </div>

      <p v-else-if="!rows.length" class="state">{{ t('leaderboard.empty') }}</p>

      <template v-else>
        <table class="standings">
          <caption class="sr-only">
            {{
              t('leaderboard.caption', { mode: t(`modes.${leaderboard.mode}.name`) })
            }}
          </caption>

          <colgroup>
            <col class="place-column" />
            <col />
            <col class="rating-column" />
          </colgroup>

          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{{ t('leaderboard.coach') }}</th>
              <th scope="col">{{ t('leaderboard.rank') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="entry in rows"
              :key="entry.id"
              :class="{ own: entry.id === ownId, podium: entry.position <= 3 }"
            >
              <td class="place">{{ entry.position }}</td>

              <td>
                <div class="coach">
                  <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="34" />

                  <span class="nickname" :title="entry.name || t('profile.defaultName')">{{
                    entry.name || t('profile.defaultName')
                  }}</span>
                </div>
              </td>

              <td>
                <div class="rating" :title="t(`profile.ranks.${rankFor(entry.rating).tier}`)">
                  <RankMedal
                    :tier="rankFor(entry.rating).tier"
                    :stars="rankFor(entry.rating).stars"
                    :size="32"
                  />

                  <span
                    ><strong>{{ text.number(entry.rating) }} <small>MMR</small></strong>

                    <span class="rank-name">{{
                      t(`profile.ranks.${rankFor(entry.rating).tier}`)
                    }}</span></span
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <button
          v-if="shown < leaderboard.rows.length"
          type="button"
          class="btn more"
          @click="shown += PAGE_SIZE"
        >
          <ChevronDown :size="17" /> {{ t('leaderboard.more') }}
        </button>
      </template>
    </main>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.leaderboard-page {
  min-height: 100%;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-top: env(safe-area-inset-top, 0px);
  background: #131b18dc;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--edge);
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 940px;
  min-height: 64px;
  margin: 0 auto;
  padding: 10px 20px;
}
.page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 940px;
  margin: 0 auto;
  padding: 36px 20px 80px;
}
.heading {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold);
}
h1 {
  margin: 0;
  font-size: clamp(40px, 7vw, 68px);
  line-height: 1;
}
.modes {
  display: flex;
  gap: 8px;
}
.modes button {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #ffffff04;
  color: var(--chalk-dim);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.modes button.selected {
  border-color: #f4c55b80;
  background: #f4c55b10;
  color: var(--gold);
}
.modes button:hover {
  border-color: var(--gold);
}
.modes button:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 220px;
  margin: 0;
  color: var(--chalk-dim);
  text-align: center;
}
.state p {
  margin: 0;
}
.standings {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.place-column {
  width: 60px;
}
.rating-column {
  width: 230px;
}
th {
  padding: 12px 16px;
  border-bottom: 1px solid var(--edge-strong);
  color: var(--chalk-faint);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
}
td {
  height: 72px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--edge);
}
.place {
  font-size: 16px;
  font-weight: 800;
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}
.podium .place {
  color: var(--gold);
}
.own .nickname {
  color: var(--gold);
}
.coach {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
}
.nickname {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rating {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rating > span {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.rating strong {
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.rating small {
  font-size: 10px;
  color: var(--chalk-faint);
}
.rank-name {
  font-size: 11px;
  color: var(--chalk-dim);
}
.more {
  align-self: center;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    rotate: 360deg;
  }
}
@media (max-width: 600px) {
  .page {
    padding: 26px 12px 60px;
    gap: 18px;
  }
  .bar {
    padding-inline: 12px;
  }
  .modes {
    gap: 5px;
  }
  .modes button {
    justify-content: center;
    flex-direction: column;
    gap: 6px;
    padding: 9px 4px;
    font-size: 11px;
  }
  .place-column {
    width: 28px;
  }
  .rating-column {
    width: 108px;
  }
  th,
  td {
    padding-inline: 5px;
  }
  td {
    height: 64px;
  }
  .coach {
    gap: 10px;
  }
  .nickname {
    font-size: 12px;
  }
  .rating {
    gap: 5px;
  }
  .rating strong {
    font-size: 14px;
  }
  .rating small {
    display: none;
  }
  .rank-name {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
