<script setup lang="ts">
import { Play, Trophy, User, Users } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useFriendsStore } from '../../stores/friends'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { useLegalStore } from '../../stores/legal'
import { usePatchNotesStore } from '../../stores/patchNotes'
import { useProfileStore } from '../../stores/profile'

/**
 * Thumb-reach navigation on a phone, fixed to the bottom edge of every page: the game, the career, friends and the
 * profile, one tap apart.
 */
const profile = useProfileStore()
const patchNotes = usePatchNotesStore()
const leaderboard = useLeaderboardStore()
const legal = useLegalStore()
const cloud = useCloudStore()
const chat = useChatStore()
const friends = useFriendsStore()
const { t } = useGameText()

const onStart = computed(
  () => !profile.isOpen && patchNotes.patch === null && !leaderboard.isOpen && legal.document === null,
)

const news = computed(() => friends.incoming.length + chat.totalUnread)

/** Back to the start screen, or to the match a page was covering. */
function play() {
  if (legal.document) {
    legal.close()
  } else if (patchNotes.patch) {
    patchNotes.close()
  } else if (leaderboard.isOpen) {
    leaderboard.close()
  } else {
    profile.close()
  }
}

function openFriends() {
  if (cloud.signedIn) {
    chat.toggleWindow()
  } else {
    cloud.signInOpen = true
  }
}
</script>

<template>
  <nav class="mobile-tabs" :aria-label="t('start.home.navigation')">
    <a
      href="/"
      class="tab"
      :class="{ active: onStart }"
      :aria-current="onStart ? 'page' : undefined"
      @click.prevent="play"
    >
      <Play :size="20" /> {{ t('start.home.tabs.play') }}
    </a>

    <a
      href="/career"
      class="tab"
      :class="{ active: profile.isCareer }"
      :aria-current="profile.isCareer ? 'page' : undefined"
      @click.prevent="profile.openCareer()"
    >
      <Trophy :size="20" /> {{ t('start.home.tabs.career') }}
    </a>

    <button
      v-if="cloud.enabled"
      type="button"
      class="tab"
      :class="{ active: chat.windowOpen }"
      :aria-expanded="chat.windowOpen"
      @click="openFriends"
    >
      <span class="tab-icon">
        <Users :size="20" />
        <span v-if="news" class="badge">{{ news }}</span>
      </span>
      {{ t('start.home.tabs.friends') }}
    </button>

    <a
      href="/profile"
      class="tab"
      :class="{ active: profile.isOpen && !profile.isCareer }"
      :aria-current="profile.isOpen && !profile.isCareer ? 'page' : undefined"
      @click.prevent="profile.open()"
    >
      <User :size="20" /> {{ t('start.home.tabs.profile') }}
    </a>
  </nav>
</template>

<style scoped>
/* Fixed to the bottom edge: square along it, rounded where it is exposed. */
.mobile-tabs {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  min-height: var(--mobile-tabs);
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--edge-strong);
  border-radius: var(--radius) var(--radius) 0 0;
  background: rgba(15, 22, 20, 0.96);
  backdrop-filter: blur(8px);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--chalk-dim);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.tab.active {
  color: var(--gold);
}

.tab-icon {
  position: relative;
  display: grid;
}

.badge {
  position: absolute;
  top: -5px;
  right: -9px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--theirs);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}
</style>
