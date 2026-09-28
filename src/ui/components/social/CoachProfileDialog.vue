<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { Ban, MessageCircle, Swords, UserMinus, X } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref } from 'vue'
import { HERO_IDS } from '@/content/ids'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import CoachAvatar from '../profile/CoachAvatar.vue'
import MatchHistory from '../profile/MatchHistory.vue'
import RankMedal from '../profile/RankMedal.vue'

/** Removing and blocking ask once more; the question goes away on its own. */
const CONFIRM_MS = 3000

/** A friend's profile: rank, totals and latest matches, with everything that can be done with them. */
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
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
      key: 'peak',
      label: t('coach.peak'),
      value: text.number(profile.value.peakRating),
      note: t(`profile.ranks.${rankFor(profile.value.peakRating).tier}`),
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

      <DialogContent class="sheet coach" :aria-describedby="undefined">
        <header class="head">
          <RankMedal :tier="rank.tier" :stars="rank.stars" :size="54" />
          <CoachAvatar :hero-id="hero" :level="level" :size="56" />

          <div class="who">
            <DialogTitle class="name">{{ name }}</DialogTitle>

            <span class="rank">
              {{ t(`profile.ranks.${rank.tier}`) }} · {{ t('coach.rating', { n: text.number(rating) }) }}
            </span>

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

          <MatchHistory v-if="profile.recent.length" :matches="profile.recent" />
          <p v-else class="muted">{{ t('coach.noMatches') }}</p>
        </template>

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
.coach {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(640px, calc(100vw - 32px));
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
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
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
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
