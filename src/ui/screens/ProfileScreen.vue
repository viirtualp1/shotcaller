<script setup lang="ts">
import { ArrowLeft, Castle, Flame, Percent, Skull, Swords, Timer } from '@lucide/vue'
import { computed, ref, type Component } from 'vue'
import AvatarPicker from '../components/profile/AvatarPicker.vue'
import CloudCard from '../components/profile/CloudCard.vue'
import TelemetrySettings from '../components/settings/TelemetrySettings.vue'
import CareerCard from '../components/profile/CareerCard.vue'
import { winRate } from '../components/profile/format'
import HeroTable from '../components/profile/HeroTable.vue'
import ModeRatings from '../components/modes/ModeRatings.vue'
import MatchHistory from '../components/profile/MatchHistory.vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import FriendsCard from '../components/social/FriendsCard.vue'
import { useGameText } from '../composables/useGameText'
import { useCloudStore } from '../stores/cloud'
import { useMenuStore } from '../stores/menu'
import { useProfileStore } from '../stores/profile'
import { usePrivacyStore } from '../stores/privacy'

interface Tile {
  readonly key: string
  readonly icon: Component
  readonly label: string
  readonly value: string
  readonly note?: string
}

const profile = useProfileStore()
const cloud = useCloudStore()
const privacy = usePrivacyStore()
const menu = useMenuStore()
const text = useGameText()
const { t } = text

const picking = ref(false)

const totals = computed(() => profile.profile.totals)

const streak = computed(() => {
  const { streak: n } = totals.value
  if (n > 0) {
    return t('profile.stats.winStreak', { n }, n)
  }

  return n < 0 ? t('profile.stats.lossStreak', { n: -n }, -n) : t('profile.stats.noStreak')
})

const tiles = computed<Tile[]>(() => {
  const s = totals.value

  return [
    {
      key: 'matches',
      icon: Swords,
      label: t('profile.stats.matches'),
      value: text.number(s.matches),
      note: t('profile.stats.record', {
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
      }),
    },
    {
      key: 'winRate',
      icon: Percent,
      label: t('profile.stats.winRate'),
      value: `${winRate(s.wins, s.matches)}%`,
    },
    {
      key: 'streak',
      icon: Flame,
      label: t('profile.stats.streak'),
      value: streak.value,
      note: t('profile.stats.bestStreak', { n: s.bestWinStreak }),
    },
    {
      key: 'fastest',
      icon: Timer,
      label: t('profile.stats.fastestWin'),
      value: s.fastestWin === null ? '—' : t('profile.stats.rounds', { n: s.fastestWin }, s.fastestWin),
    },
    {
      key: 'thrones',
      icon: Castle,
      label: t('profile.stats.thrones'),
      value: text.number(s.throneWins),
    },
    {
      key: 'kills',
      icon: Skull,
      label: t('profile.stats.kills'),
      value: text.number(s.heroKills),
    },
  ]
})

function play() {
  profile.close()
  menu.newMatch = true
}
</script>

<template>
  <div class="profile-page">
    <header class="topbar">
      <div class="bar">
        <a href="/" class="btn ghost" @click.prevent="profile.close()">
          <ArrowLeft :size="16" /> {{ t('profile.back') }}
        </a>
      </div>
    </header>

    <main class="page">
      <div
        v-if="cloud.enabled"
        class="save-overview"
        :class="{ single: !privacy.enabled || !cloud.signedIn }"
      >
        <CloudCard class="cloud-save" />
        <TelemetrySettings compact class="telemetry-card" />
      </div>

      <div class="profile-overview">
        <ProfileHeader class="profile-header" @pick-avatar="picking = true" />
        <CareerCard class="career-link" />
      </div>

      <ModeRatings :ratings="profile.profile.ratings" />

      <section class="tiles">
        <article v-for="tile in tiles" :key="tile.key" class="tile">
          <span class="tile-label"><component :is="tile.icon" :size="14" /> {{ tile.label }}</span>
          <strong class="tile-value">{{ tile.value }}</strong>
          <span v-if="tile.note" class="tile-note">{{ tile.note }}</span>
        </article>
      </section>

      <template v-if="totals.matches">
        <div class="columns" :class="{ single: !cloud.enabled }">
          <HeroTable />
          <FriendsCard v-if="cloud.enabled" class="friends" />
        </div>

        <MatchHistory />
      </template>

      <template v-else>
        <section class="empty">
          <h2 class="hand">{{ t('profile.empty.title') }}</h2>

          <button type="button" class="btn primary big" @click="play">
            <Swords :size="18" /> {{ t('profile.empty.play') }}
          </button>
        </section>

        <FriendsCard v-if="cloud.enabled" />
      </template>
    </main>

    <AvatarPicker v-model:open="picking" />
  </div>
</template>

<style scoped>
.profile-page {
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

.save-overview,
.profile-overview {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(230px, 1fr);
  align-items: stretch;
  gap: 16px;
}

.save-overview.single {
  grid-template-columns: minmax(0, 1fr);
}

.cloud-save {
  min-width: 0;
}

.telemetry-card {
  min-width: 0;
}

.profile-header {
  min-width: 0;
  gap: 24px;
}

.profile-header :deep(.level .bar) {
  width: 120px;
}

.career-link {
  min-width: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: rgba(17, 24, 21, 0.86);
}

.tile-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.tile-label svg {
  color: var(--gold);
}

.tile-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.tile-note {
  font-size: 12px;
  color: var(--chalk-dim);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.columns.single {
  grid-template-columns: minmax(0, 1fr);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  border-radius: 18px;
  border: 1px dashed var(--edge-strong);
  text-align: center;
}

.empty h2 {
  font-size: 38px;
}

.empty p {
  max-width: 44ch;
  margin: 0 0 8px;
  color: var(--chalk-dim);
}

@media (max-width: 900px) {
  .save-overview,
  .profile-overview {
    grid-template-columns: minmax(0, 1fr);
  }

  .columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Beside the heroes table the friends card takes the table's height and its list scrolls within it. */
@media (min-width: 901px) {
  .columns:not(.single) > .friends {
    align-self: stretch;
  }

  .columns:not(.single) > .friends :deep(.scroll) {
    flex: 1 1 160px;
    max-height: none;
    contain: size;
  }
}

@media (max-width: 720px) {
  .profile-header {
    gap: 12px;
  }

  .page {
    padding-inline: 16px;
  }
}
</style>
