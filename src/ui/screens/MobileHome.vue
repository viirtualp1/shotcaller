<script setup lang="ts">
import { CloudUpload, Play, Settings, Trophy, User, UserPlus, Users } from '@lucide/vue'
import { computed, defineAsyncComponent } from 'vue'
import { IN_DISCORD, inviteToActivity } from '@/application/discord'
import BoardFrame from '../components/board/BoardFrame.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import ContractsStrip from '../components/home/ContractsStrip.vue'
import NewsChips from '../components/home/NewsChips.vue'
import QuickStarts from '../components/home/QuickStarts.vue'
import SavedMatchCard from '../components/home/SavedMatchCard.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import CoachAvatar from '../components/profile/CoachAvatar.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useAccountPhoto } from '../composables/useAccountPhoto'
import { useGameText } from '../composables/useGameText'
import { useNewcomer } from '../composables/useNewcomer'
import { useChatStore } from '../stores/chat'
import { useCloudStore } from '../stores/cloud'
import { useDuelStore } from '../stores/duel'
import { useFriendsStore } from '../stores/friends'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { useProfileStore } from '../stores/profile'

/**
 * The start screen on a phone, built around one question: what does the coach do next. The match to carry on
 * comes first, then a new one in a tap, then the week's goals; navigation sits at the bottom, under the thumb.
 */
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

const store = useMatchStore()
const menu = useMenuStore()
const duel = useDuelStore()
const profile = useProfileStore()
const cloud = useCloudStore()
const chat = useChatStore()
const friends = useFriendsStore()
const photo = useAccountPhoto()
const newcomer = useNewcomer()
const text = useGameText()
const { t } = text

const news = computed(() => friends.incoming.length + chat.totalUnread)

function openFriends() {
  if (cloud.signedIn) {
    chat.toggleWindow()
  } else {
    cloud.signInOpen = true
  }
}
</script>

<template>
  <main class="mobile-home">
    <header class="bar">
      <a href="/profile" class="identity" :aria-label="t('profile.title')" @click.prevent="profile.open()">
        <CoachAvatar
          :hero-id="profile.avatar"
          :level="profile.level.level"
          :size="38"
          :photo="photo.shown.value"
        />

        <span class="who">
          <strong class="name">{{ profile.profile.name || t('profile.defaultName') }}</strong>

          <span class="rank">
            {{ t(`profile.ranks.${profile.rank.tier}`) }} · {{ text.mmr(profile.profile.rating) }}
          </span>
        </span>
      </a>

      <button
        v-if="cloud.enabled && !cloud.signedIn"
        type="button"
        class="icon-btn"
        :aria-label="t('cloud.button.signIn')"
        @click="cloud.signInOpen = true"
      >
        <CloudUpload :size="19" />
      </button>

      <button type="button" class="icon-btn" :aria-label="t('hud.settings')" @click="menu.settings = true">
        <Settings :size="19" />
      </button>
    </header>

    <section v-if="newcomer" class="pitch">
      <h1 class="hand">{{ t('app.title') }}</h1>
      <p>{{ t('start.lede') }}</p>
    </section>

    <DuelResumeCard />

    <SavedMatchCard />

    <button
      v-if="!store.saved && !duel.resumable"
      type="button"
      class="btn primary block big"
      :disabled="duel.matchmaking"
      @click="menu.openNewMatch('computer')"
    >
      <Play :size="18" /> {{ t('start.home.play') }}
    </button>

    <QuickStarts />

    <button
      v-if="IN_DISCORD"
      type="button"
      class="btn block"
      @click="inviteToActivity(t('start.inviteMessage'))"
    >
      <UserPlus :size="17" /> {{ t('start.invite') }}
    </button>

    <ContractsStrip />

    <NewsChips />

    <section v-if="newcomer" class="preview">
      <BoardFrame>
        <DemoBattle mode="twoLanes" />
      </BoardFrame>
    </section>

    <footer class="footer">
      <LanguageSwitch compact />
      <SupportButton />
      <LegalLinks />
    </footer>

    <nav class="tabs" :aria-label="t('start.home.navigation')">
      <span class="tab active" aria-current="page"><Play :size="20" /> {{ t('start.home.tabs.play') }}</span>

      <a href="/career" class="tab" @click.prevent="profile.openCareer()">
        <Trophy :size="20" /> {{ t('start.home.tabs.career') }}
      </a>

      <button v-if="cloud.enabled" type="button" class="tab" @click="openFriends">
        <span class="tab-icon">
          <Users :size="20" />
          <span v-if="news" class="badge">{{ news }}</span>
        </span>
        {{ t('start.home.tabs.friends') }}
      </button>

      <a href="/profile" class="tab" @click.prevent="profile.open()">
        <User :size="20" /> {{ t('start.home.tabs.profile') }}
      </a>
    </nav>
  </main>
</template>

<style scoped>
.mobile-home {
  --tabs: 62px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px
    calc(var(--tabs) + 20px + env(safe-area-inset-bottom, 0px));
}

/* One slim row instead of three tall cards: who you are, and the two things you might change. */
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
}

.identity {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: inherit;
}

.identity,
.tab {
  text-decoration: none;
}

.who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank {
  overflow: hidden;
  font-size: 12px;
  color: var(--chalk-dim);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  width: 40px;
  height: 40px;
}

.pitch h1 {
  margin: 4px 0 6px;
  font-size: 46px;
  line-height: 1;
}

.pitch p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--chalk-dim);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
}

/* Thumb-reach navigation, fixed to the bottom edge: square along it, rounded where it is exposed. */
.tabs {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  min-height: var(--tabs);
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
