<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { Ban, ChevronDown, Crown, Flag, MessageCircle, Swords, UserMinus, X } from '@lucide/vue'
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { HERO_IDS } from '@/content/ids'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useReplayStore } from '../../stores/replay'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeRatings from '../modes/ModeRatings.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'
import PresenceDot from './PresenceDot.vue'
import WatchLiveButton from './WatchLiveButton.vue'
import { relativeTime } from '../profile/format'
import RankDropdown from '../profile/RankDropdown.vue'
import FriendMatchDetails from './FriendMatchDetails.vue'
import ReportCoach from './ReportCoach.vue'

/** Removing and blocking ask once more; the question goes away on its own. */
const CONFIRM_MS = 3000

/** A friend's profile: rank, totals and latest matches, with everything that can be done with them. */
const friends = useFriendsStore()
const replay = useReplayStore()
const chat = useChatStore()
const duel = useDuelStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text
const statusText = useFriendStatus()
const confirming = ref<'remove' | 'block' | null>(null)
const reporting = ref(false)

const { start: expireConfirm } = useTimeoutFn(() => (confirming.value = null), CONFIRM_MS, {
  immediate: false,
})

/** The opened match stays open while its replay plays and the profile steps aside. */
const expanded = ref<string>()

watch(
  () => friends.viewedId,
  () => (expanded.value = undefined),
)

/* Hidden under a replay: a modal left open underneath traps focus and closes on the first press. */
const open = computed({
  get: () => friends.viewedId !== null && replay.match === null,
  set: (value) => {
    if (!value) {
      friends.closeProfile()
    }
  },
})

useModal(open)

const entry = computed(() => friends.friends.find((f) => f.id === friends.viewedId) ?? null)
const profile = computed(() => friends.viewed)
const rating = computed(() => profile.value?.rating ?? entry.value?.rating ?? 0)
const rank = computed(() => rankFor(rating.value))
const name = computed(() => entry.value?.name || profile.value?.name || t('profile.defaultName'))

const hero = computed(
  () => HERO_IDS.find((id) => id === (entry.value?.avatar ?? profile.value?.avatar)) ?? 'spearman',
)

const photo = computed(() => entry.value?.photo ?? profile.value?.photo ?? null)

const level = computed(() => (profile.value ? levelFor(profile.value.xp).level : null))

const canDuel = computed(
  () =>
    entry.value !== null &&
    friends.isOnline(entry.value.id) &&
    friends.statusOf(entry.value.id)?.activity !== 'duel' &&
    !duel.busy,
)

const tiles = computed(() => {
  /* A coach who has not played yet still has a record: all zeros. */
  const totals = profile.value?.totals ?? {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    bestWinStreak: 0,
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
    duel.challenge(id)
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
            <RankDropdown :rank="rank" :size="54" />
            <span class="medal-name">{{ t(`profile.ranks.${rank.tier}`) }}</span>
          </span>

          <span class="avatar">
            <CoachAvatar :hero-id="hero" :photo="photo" :level="level" :size="56" />
            <PresenceDot v-if="entry" :friend-id="entry.id" />
          </span>

          <div class="who">
            <DialogTitle class="name">{{ name }}</DialogTitle>

            <span v-if="entry" class="status" :class="{ online: friends.isOnline(entry.id) }">
              {{ statusText(entry.id) }}
            </span>
          </div>

          <dl class="stats">
            <div v-for="tile in tiles" :key="tile.key" class="stat" :title="tile.note || undefined">
              <dt class="stat-label">{{ tile.label }}</dt>
              <dd class="stat-value">{{ tile.value }}</dd>
            </div>
          </dl>

          <DialogClose class="icon-btn close" :aria-label="t('coach.close')">
            <X :size="16" />
          </DialogClose>
        </header>

        <div v-if="friends.viewLoading" class="bones" role="status">
          <p class="sr-only">{{ t('coach.loading') }}</p>

          <div class="mode-bones">
            <div v-for="mode in 3" :key="mode" class="mode-bone">
              <span class="bone map" />

              <span class="lines">
                <span class="bone mode-name" />
                <span class="bone mode-rating" />
                <span class="bone mode-tier" />
              </span>

              <span class="bone round bone-medal" />
            </div>
          </div>

          <span class="bone bone-label" />

          <div v-for="match in 4" :key="match" class="match-bone">
            <span class="bone bone-verdict" />
            <span class="bone bone-delta" />

            <span class="bone-heroes">
              <span v-for="seat in 4" :key="seat" class="bone round bone-hero" />
            </span>

            <span class="bone bone-when" />
          </div>
        </div>

        <p v-else-if="!profile" class="muted">{{ t('coach.unavailable') }}</p>

        <template v-else>
          <ModeRatings :ratings="profile.ratings" />

          <section class="history">
            <h3 class="section-title">{{ t('coach.history') }}</h3>

            <AccordionRoot
              v-if="profile.recent.length"
              v-model="expanded"
              as="ol"
              type="single"
              collapsible
              class="matches"
            >
              <AccordionItem
                v-for="match in profile.recent"
                :key="match.id"
                as="li"
                :value="match.id"
                class="match"
                :class="match.verdict"
              >
                <AccordionHeader as="h4" class="match-head">
                  <AccordionTrigger class="match-row" :title="t('matchDetails.open')">
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
                        {{ text.mmr(match.ratingAfter - match.ratingBefore, true) }}
                      </template>
                    </span>

                    <!-- Spans, not a list: a button holds only phrasing content. -->
                    <span class="lineup">
                      <span v-for="(pick, i) in match.lineup" :key="i" class="hero">
                        <Crown v-if="pick.heroId === match.mvp" :size="10" class="crown" />
                        <HeroAvatar :hero-id="pick.heroId" :stars="pick.stars" :size="24" />
                      </span>
                    </span>

                    <span class="meta">
                      <span class="mode">
                        <Swords v-if="match.duel" :size="11" :aria-label="t('matchDetails.duel')" />
                        {{ t(`modes.${match.mode}.name`) }}
                      </span>
                      ·
                      {{ t('profile.history.rounds', { won: match.roundsWon, lost: match.roundsLost }) }}
                      ·
                      <time :datetime="match.playedAt">{{
                        relativeTime(match.playedAt, settings.locale)
                      }}</time>
                    </span>

                    <ChevronDown :size="16" class="chevron" aria-hidden="true" />
                  </AccordionTrigger>
                </AccordionHeader>

                <AccordionContent class="details">
                  <div class="details-inner">
                    <FriendMatchDetails :match-id="match.id" />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </AccordionRoot>

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

          <WatchLiveButton :friend-id="entry.id" :name="name" />

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

          <button type="button" class="btn ghost" :aria-expanded="reporting" @click="reporting = !reporting">
            <Flag :size="16" /> {{ t('playerReport.open') }}
          </button>
        </footer>

        <ReportCoach v-if="entry && reporting" :coach-id="entry.id" :name="name" @close="reporting = false" />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.avatar {
  position: relative;
  display: grid;
  flex: none;
}

.mode {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

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

.bones {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mode-bones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
}

.mode-bone {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--card);
}

.map {
  flex: none;
  width: 56px;
  height: 56px;
}

.lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.mode-name {
  width: 46%;
  height: 10px;
}

.mode-rating {
  width: 62%;
  height: 18px;
}

.mode-tier {
  width: 38%;
  height: 10px;
}

.bone-medal {
  flex: none;
  width: 48px;
  height: 48px;
}

.bone-label {
  width: 92px;
  height: 12px;
}

.match-bone {
  display: grid;
  grid-template-columns: 72px 56px minmax(0, 1fr) 120px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--edge-strong);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
}

.bone-verdict {
  width: 64px;
  height: 12px;
}

.bone-delta {
  width: 40px;
  height: 12px;
}

.bone-heroes {
  display: flex;
  gap: 4px;
}

.bone-hero {
  width: 24px;
  height: 24px;
}

.bone-when {
  width: 100%;
  height: 10px;
}

@media (max-width: 600px) {
  .match-bone {
    grid-template-columns: 64px 40px minmax(0, 1fr);
  }

  .bone-when {
    grid-column: 1 / -1;
    width: 70%;
  }
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

.match {
  --verdict: var(--chalk-faint);
  border-radius: var(--radius);
  background: linear-gradient(90deg, color-mix(in srgb, var(--verdict) 12%, transparent), transparent 45%);
  border-left: 3px solid var(--verdict);
  transition: background-color 0.15s;
}

.match[data-state='open'] {
  background-color: rgba(255, 255, 255, 0.03);
}

.match-head {
  margin: 0;
  font: inherit;
}

/* One line per match: result, rating change, the lineup in a row, then rounds and when. */
.match-row {
  display: grid;
  grid-template-columns: 96px 86px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 6px 12px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.match-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.match-row:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.chevron {
  color: var(--chalk-faint);
  transition:
    color 0.15s,
    rotate 0.2s ease;
}

.match-row:hover .chevron {
  color: var(--chalk);
}

.match-row[data-state='open'] .chevron {
  rotate: 180deg;
}

.details {
  overflow: hidden;
}

.details[data-state='open'] {
  animation: expand 0.2s ease-out;
}

.details[data-state='closed'] {
  animation: collapse 0.2s ease-out;
}

.details-inner {
  padding: 6px 12px 14px;
}

@keyframes expand {
  from {
    height: 0;
  }

  to {
    height: var(--reka-accordion-content-height);
  }
}

@keyframes collapse {
  from {
    height: var(--reka-accordion-content-height);
  }

  to {
    height: 0;
  }
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

/* A flex row, so the mode with its duel icon sits on the same centre line as the rounds and the date. */
.meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--chalk-dim);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .match-row {
    grid-template-columns: auto auto minmax(0, 1fr) auto;
  }

  .meta {
    grid-column: 1 / -1;
  }

  .chevron {
    grid-area: 1 / 4;
  }

  .details-inner {
    padding-inline: 8px;
  }
}

.stats {
  display: flex;
  flex: none;
  gap: 18px;
  margin: 0;
  padding-right: 6px;
}

.stat {
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-faint);
  white-space: nowrap;
}

.stat-value {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

/* On a narrow screen the numbers take their own row under the name. */
@media (max-width: 600px) {
  .head {
    flex-wrap: wrap;
  }

  .close {
    order: 1;
  }

  .stats {
    order: 2;
    width: 100%;
    justify-content: space-around;
    padding: 8px 0 0;
    border-top: 1px solid var(--edge);
  }

  .stat {
    align-items: center;
  }
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
