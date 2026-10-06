<script setup lang="ts">
import { ExternalLink, Lock, Trophy } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, ref, shallowRef, watch } from 'vue'
import { HERO_IDS, MODE_IDS, type ModeId } from '@/content/ids'
import type { LeaderboardEntry } from '@/application/social/leaderboard'
import { rankFor } from '@/domain/profile/progression'
import ModeMap from '../modes/ModeMap.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useFriendsStore } from '../../stores/friends'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { useSettingsStore } from '../../stores/settings'

const PREVIEW = 5
const SKELETON_ROWS = 3

const props = withDefaults(defineProps<{ fill?: boolean }>(), { fill: false })

const cloud = useCloudStore()
const leaderboard = useLeaderboardStore()
const friends = useFriendsStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

const mode = ref<ModeId>(settings.mode)
const rows = shallowRef<LeaderboardEntry[]>([])
const loading = ref(false)
const error = ref(false)
const ownId = computed(() => cloud.account?.id)
const preview = computed(() => rows.value.slice(0, PREVIEW))

/* A toggle group lets its pressed item be pressed off; a tab stays on until another one is picked. */
const modeTab = computed({
  get: () => mode.value,
  set: (value: string | undefined) => {
    if (value) {
      mode.value = value as ModeId
    }
  },
})

let generation = 0

function heroOf(avatar: string | null) {
  return HERO_IDS.find((id) => id === avatar) ?? 'spearman'
}

function open() {
  leaderboard.open(mode.value)
}

async function refresh() {
  const attempt = ++generation
  const selected = mode.value
  error.value = false

  if (!cloud.enabled) {
    rows.value = []
    loading.value = false

    return
  }

  rows.value = []
  loading.value = true

  try {
    const connection = await cloud.connect()

    if (attempt !== generation) {
      return
    }

    const result = await connection.leaderboard().read(selected)

    if (attempt === generation) {
      rows.value = result
    }
  } catch {
    if (attempt === generation) {
      error.value = true
      rows.value = []
    }
  } finally {
    if (attempt === generation) {
      loading.value = false
    }
  }
}

watch([mode, () => cloud.enabled, () => cloud.account?.id, () => cloud.signedIn], () => void refresh(), {
  immediate: true,
})
</script>

<template>
  <section class="board" :class="{ fill: props.fill }" :aria-label="t('leaderboard.title')">
    <div class="head">
      <button type="button" class="title" @click="open">
        <Trophy :size="15" />
        {{ t('leaderboard.title') }}
      </button>
    </div>

    <ToggleGroupRoot v-model="modeTab" type="single" class="modes tab-list" :aria-label="t('modes.title')">
      <ToggleGroupItem v-for="id in MODE_IDS" :key="id" :value="id" class="tab">
        <ModeMap :mode="id" :size="16" aria-hidden="true" />
        <span>{{ t(`modes.${id}.name`) }}</span>
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <p v-if="!cloud.enabled" class="state">{{ t('leaderboard.off') }}</p>

    <div v-else-if="error" class="state" role="alert">
      <p>{{ t('leaderboard.error') }}</p>
      <button type="button" class="btn" @click="refresh()">{{ t('friends.retry') }}</button>
    </div>

    <p v-else-if="!loading && !rows.length" class="state">{{ t('leaderboard.empty') }}</p>

    <div v-else class="standings">
      <div class="scroll" :aria-busy="loading || undefined">
        <ol v-if="loading" class="list">
          <li v-for="row in SKELETON_ROWS" :key="row">
            <span class="bone place-bone" />

            <span class="who">
              <span class="bone round face" />
              <span class="bone nick" />
            </span>

            <span class="bone mmr-bone" />
          </li>
        </ol>

        <ol v-else class="list">
          <li
            v-for="(entry, index) in preview"
            :key="entry.id"
            :class="{ own: entry.id === ownId, podium: index < 3 }"
          >
            <span class="place">{{ index + 1 }}</span>

            <button
              v-if="friends.canOpenProfile(entry)"
              type="button"
              class="who open-profile"
              :aria-label="t('dossier.open', { name: entry.name || t('profile.defaultName') })"
              @click="friends.openProfile(entry.id)"
            >
              <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="28" />

              <span class="name">{{ entry.name || t('profile.defaultName') }}</span>
            </button>

            <span v-else class="who" :title="t('dossier.private')">
              <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="28" />

              <span class="name">{{ entry.name || t('profile.defaultName') }}</span>

              <Lock :size="11" class="lock" :aria-label="t('dossier.private')" />
            </span>

            <span class="rating" :title="t(`profile.ranks.${rankFor(entry.rating).tier}`)">
              <RankMedal :tier="rankFor(entry.rating).tier" :stars="rankFor(entry.rating).stars" :size="22" />
              <strong>{{ text.number(entry.rating) }}</strong>
            </span>
          </li>
        </ol>
      </div>

      <button v-if="!loading" type="button" class="more" @click="open">
        <ExternalLink :size="14" />
        {{ t('leaderboard.seeMore') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
}

.board.fill {
  flex: 1;
  min-height: 0;
}

.head {
  display: flex;
  align-items: center;
  padding: 10px 12px 0;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.title svg {
  color: var(--gold);
}

.title:hover {
  color: var(--gold);
}

.modes {
  margin: 8px 12px 0;
}

.modes :deep(.tab) {
  font-size: 11px;
}

.modes :deep(.tab span) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.title:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
  padding: 16px;
  color: var(--chalk-dim);
  font-size: 13px;
  text-align: center;
}

.state p {
  margin: 0;
}

.standings {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.scroll {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
  overflow: auto;
}

.board:not(.fill) .scroll {
  flex: none;
  max-height: 280px;
}

.more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 8px 12px 10px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gold);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.more:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 12px;
  border-top: 1px solid var(--edge);
}

.place {
  color: var(--chalk-faint);
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.podium .place,
.own .name {
  color: var(--gold);
}

.who {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* A shared profile opens from its row; a private one shows a lock instead. */
.open-profile {
  padding: 2px 4px 2px 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.open-profile:hover .name {
  color: var(--gold);
}

.open-profile:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.lock {
  flex: none;
  color: var(--chalk-faint);
}

.name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rating {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rating strong {
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.place-bone {
  width: 16px;
  height: 12px;
  margin-inline: auto;
}

.face {
  flex: none;
  width: 28px;
  height: 28px;
}

.nick {
  width: 96px;
  height: 12px;
}

.mmr-bone {
  width: 48px;
  height: 12px;
}
</style>
