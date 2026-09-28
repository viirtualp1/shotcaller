<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { Ban, Crown, MessageCircle, Swords, UserMinus, X } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { HERO_IDS } from '@/content/ids'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'
import { relativeTime } from '../profile/format'
import RankMedal from '../profile/RankMedal.vue'

/** Removing and blocking ask once more; the question goes away on its own. */
const CONFIRM_MS = 3000

/** A friend's profile: rank, totals and latest matches, with everything that can be done with them. */
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text
const statusText = useFriendStatus()
const confirming = ref<'remove' | 'block' | null>(null)

const { start: expireConfirm } = useTimeoutFn(() => (confirming.value = null), CONFIRM_MS, {
  immediate: false,
})

const open = computed({
  get: () => friends.viewedId !== null,
  set: (value) => {
    if (!value) {
      friends.closeProfile()
    }
  },
})

const entry = computed(() => friends.friends.find((f) => f.id === friends.viewedId) ?? null)
const profile = computed(() => friends.viewed)
const rating = computed(() => profile.value?.rating ?? entry.value?.rating ?? 0)
const rank = computed(() => rankFor(rating.value))
const name = computed(() => entry.value?.name || profile.value?.name || t('profile.defaultName'))

const hero = computed(
  () => HERO_IDS.find((id) => id === (entry.value?.avatar ?? profile.value?.avatar)) ?? 'spearman',
)

const level = computed(() => (profile.value ? levelFor(profile.value.xp).level : null))
const canDuel = computed(() => entry.value !== null && friends.isOnline(entry.value.id) && !duel.busy)

/* The profile takes the stage: an open chat steps aside. */
watch(
  () => friends.viewedId,
  (id) => {
    if (id) {
      chat.close()
    }
  },
)

const tiles = computed(() => {
  const totals = profile.value?.totals
  if (!profile.value || !totals) {
    return []
  }

  const winRate = totals.matches ? Math.round((totals.wins / totals.matches) * 100) : 0

  return [
    {
      key: 'matches',
      label: t('coach.matches'),
      value: text.number(totals.matches),
      note: t('profile.stats.record', {
        wins: totals.wins,
        losses: totals.losses,
        draws: totals.draws,
      }),
    },
    {
      key: 'winRate',
      label: t('coach.winRate'),
      value: `${winRate}%`,
      note: '',
    },
    {
      key: 'streak',
      label: t('coach.bestStreak'),
      value: text.number(totals.bestWinStreak),
      note: '',
    },
  ]
})

function message() {
  const id = friends.viewedId
  friends.closeProfile()

  if (id) {
    void chat.open(id)
  }
}

function challenge() {
  const id = friends.viewedId
  friends.closeProfile()

  if (id) {
    void duel.invite(id)
  }
}

function ask(action: 'remove' | 'block') {
  const id = friends.viewedId
  if (!id) {
    return
  }

  if (confirming.value !== action) {
    confirming.value = action
    expireConfirm()

    return
  }

  confirming.value = null
  friends.closeProfile()
  void (action === 'remove' ? friends.remove(id) : friends.block(id))
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet coach-profile" :aria-describedby="undefined">
        <header class="head">
          <span class="medal">
            <RankMedal :tier="rank.tier" :stars="rank.stars" :size="54" />
            <span class="medal-name">{{ t(`profile.ranks.${rank.tier}`) }}</span>
          </span>

          <CoachAvatar :hero-id="hero" :level="level" :size="56" />

          <div class="who">
            <DialogTitle class="name">{{ name }}</DialogTitle>

            <span class="rank">{{ t('coach.rating', { n: text.number(rating) }) }}</span>

            <span v-if="entry" class="status" :class="{ online: friends.isOnline(entry.id) }">
              {{ statusText(entry.id) }}
            </span>
          </div>

          <DialogClose class="icon-btn" :aria-label="t('coach.close')">
            <X :size="16" />
          </DialogClose>
        </header>

        <p v-if="friends.viewLoading" class="muted">{{ t('coach.loading') }}</p>
        <p v-else-if="!profile" class="muted">{{ t('coach.unavailable') }}</p>

        <template v-else>
          <section v-if="tiles.length" class="tiles">
            <article v-for="tile in tiles" :key="tile.key" class="tile">
              <span class="tile-label">{{ tile.label }}</span>
              <strong class="tile-value">{{ tile.value }}</strong>
              <span v-if="tile.note" class="tile-note">{{ tile.note }}</span>
            </article>
          </section>

          <section class="history">
            <h3 class="section-title">{{ t('coach.history') }}</h3>

            <ol v-if="profile.recent.length" class="matches">
              <li v-for="match in profile.recent" :key="match.id" class="match" :class="match.verdict">
                <strong class="verdict">{{ t(`result.${match.verdict}`) }}</strong>

                <span
                  class="delta"
                  :class="{
                    up: match.ratingAfter > match.ratingBefore,
                    down: match.ratingAfter < match.ratingBefore,
                  }"
                >
                  <!-- Only duels move the rating; the column stays for the row to line up. -->
                  <template v-if="match.ratingAfter !== match.ratingBefore">
                    {{ text.signed(match.ratingAfter - match.ratingBefore) }}
                  </template>
                </span>

                <ul class="lineup">
                  <li v-for="(pick, i) in match.lineup" :key="i" class="hero">
                    <Crown v-if="pick.heroId === match.mvp" :size="10" class="crown" />
                    <HeroAvatar :hero-id="pick.heroId" :stars="pick.stars" :size="24" />
                  </li>
                </ul>

                <span class="meta">
                  {{ t('profile.history.rounds', { won: match.roundsWon, lost: match.roundsLost }) }}
                  ·
                  <time :datetime="match.playedAt">{{ relativeTime(match.playedAt, settings.locale) }}</time>
                </span>
              </li>
            </ol>

            <p v-else class="muted">{{ t('coach.noMatches') }}</p>
          </section>
        </template>

        <hr v-if="entry" class="divider" />

        <footer v-if="entry" class="actions">
          <button type="button" class="btn primary" @click="message">
            <MessageCircle :size="16" /> {{ t('friends.message') }}
          </button>

          <button v-if="canDuel" type="button" class="btn" @click="challenge">
            <Swords :size="16" /> {{ t('duel.challenge') }}
          </button>

          <span class="spacer" />

          <button
            type="button"
            class="btn ghost"
            :class="{ danger: confirming === 'remove' }"
            @click="ask('remove')"
          >
            <UserMinus :size="16" />
            {{ confirming === 'remove' ? t('coach.confirmRemove') : t('coach.remove') }}
          </button>

          <button
            type="button"
            class="btn ghost"
            :class="{ danger: confirming === 'block' }"
            :title="t('chat.blockHint')"
            @click="ask('block')"
          >
            <Ban :size="16" /> {{ confirming === 'block' ? t('coach.confirmBlock') : t('coach.block') }}
          </button>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Not `.coach`: that is the avatar's own class, and scoped styles reach a child component's root. */
.coach-profile {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(860px, calc(100vw - 32px));
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.medal {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.medal-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--chalk-dim);
  white-space: nowrap;
}

.divider {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--edge);
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  margin: 0;
  overflow: hidden;
  font-size: 22px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank {
  font-size: 13px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.status {
  font-size: 12.5px;
  color: var(--chalk-faint);
}

.status.online {
  color: var(--heal);
}

.muted {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-faint);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

.matches {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* One line per match: result, rating change, the lineup in a row, then rounds and when. */
.match {
  --verdict: var(--chalk-faint);
  display: grid;
  grid-template-columns: 96px 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--verdict) 12%, transparent), transparent 45%);
  border-left: 3px solid var(--verdict);
}

.match.win {
  --verdict: var(--heal);
}

.match.loss {
  --verdict: var(--theirs);
}

.verdict {
  color: var(--verdict);
  font-size: 14px;
}

.delta {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--chalk-dim);
}

.delta.up {
  color: var(--heal);
}

.delta.down {
  color: var(--theirs);
}

/* Room above for the MVP crown and below for the stars; long lineups wrap instead of being cut. */
.lineup {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 8px 0 4px;
  list-style: none;
}

.hero {
  position: relative;
  display: grid;
  flex: none;
}

.crown {
  position: absolute;
  top: -7px;
  left: 50%;
  translate: -50% 0;
  z-index: 1;
  color: var(--gold);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
}

.meta {
  font-size: 12px;
  color: var(--chalk-dim);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .match {
    grid-template-columns: auto auto minmax(0, 1fr);
  }

  .meta {
    grid-column: 1 / -1;
  }
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.tile-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.tile-value {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.tile-note {
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.btn.danger {
  border-color: rgba(255, 112, 96, 0.6);
  color: var(--theirs);
}
</style>
