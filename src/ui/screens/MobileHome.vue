<script setup lang="ts">
import {
  Bot,
  ChevronRight,
  CloudUpload,
  Play,
  ScrollText,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  UserPlus,
  Users,
} from '@lucide/vue'
import { computed, defineAsyncComponent } from 'vue'
import { discordInstallUrl, IN_DISCORD, inviteToActivity } from '@/application/discord'
import { MODES } from '@/content/modes'
import BoardFrame from '../components/board/BoardFrame.vue'
import DiscordIcon from '../components/common/DiscordIcon.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import BaseStatus from '../components/hud/BaseStatus.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import CoachAvatar from '../components/profile/CoachAvatar.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useAccountPhoto } from '../composables/useAccountPhoto'
import { useGameText } from '../composables/useGameText'
import { isFresh, LATEST_PATCH } from '../patchNotes/notes'
import { useChatStore } from '../stores/chat'
import { useCloudStore } from '../stores/cloud'
import { useDuelStore } from '../stores/duel'
import { useFriendsStore } from '../stores/friends'
import { useMatchStore } from '../stores/match'
import { useMenuStore, type MatchOpponent } from '../stores/menu'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useProfileStore } from '../stores/profile'

/**
 * The start screen on a phone, built around one question: what does the coach do next. The match to carry on
 * comes first, then a new one in a tap, then the week's goals; navigation sits at the bottom, under the thumb.
 */
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

const QUICK_STARTS: readonly { opponent: MatchOpponent; icon: typeof Bot; label: string }[] = [
  {
    opponent: 'computer',
    icon: Bot,
    label: 'matchmaking.computer',
  },
  {
    opponent: 'online',
    icon: Swords,
    label: 'matchmaking.online',
  },
  {
    opponent: 'training',
    icon: Target,
    label: 'sandbox.tab',
  },
]

const store = useMatchStore()
const menu = useMenuStore()
const duel = useDuelStore()
const profile = useProfileStore()
const cloud = useCloudStore()
const chat = useChatStore()
const friends = useFriendsStore()
const notes = usePatchNotesStore()
const photo = useAccountPhoto()
const text = useGameText()
const { t } = text
const discordHref = IN_DISCORD ? null : discordInstallUrl(import.meta.env)

const saved = computed(() => store.saved)
/** A coach who has never finished a match gets the pitch and the show fight; everyone else gets straight to it. */
const newcomer = computed(() => profile.profile.recent.length === 0 && !saved.value && !duel.resumable)
const completed = computed(() => profile.contracts.filter((contract) => contract.completed).length)
const nextContract = computed(() => profile.contracts.find((contract) => !contract.completed) ?? null)

const contractShare = computed(() => {
  const total = profile.contracts.reduce((sum, contract) => sum + contract.target, 0)
  const done = profile.contracts.reduce((sum, contract) => sum + contract.progress, 0)

  return total ? done / total : 0
})

const savedLabel = computed(() => {
  const state = saved.value
  if (!state) {
    return ''
  }

  const against = state.trialId ? t(`career.trials.${state.trialId}.name`) : t('start.home.vsComputer')

  return `${t(`modes.${state.mode}.name`)} · ${against}`
})

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

    <section v-if="saved" class="resume">
      <div class="resume-meta">
        <span>{{ savedLabel }}</span>
        <span>{{ t('hud.round', { round: saved.round, max: MODES[saved.mode].maxRounds }) }}</span>
      </div>

      <div class="score">
        <BaseStatus :team="0" :structures="saved.structures[0]" :mode="saved.mode" />
        <span class="vs">vs</span>
        <BaseStatus :team="1" :structures="saved.structures[1]" :mode="saved.mode" />
      </div>

      <button
        type="button"
        class="btn primary block big"
        :disabled="duel.matchmaking"
        @click="store.continueMatch()"
      >
        <Play :size="18" /> {{ t('start.home.continue') }}
      </button>
    </section>

    <button
      v-else-if="!duel.resumable"
      type="button"
      class="btn primary block big"
      :disabled="duel.matchmaking"
      @click="menu.openNewMatch('computer')"
    >
      <Play :size="18" /> {{ t('start.home.play') }}
    </button>

    <nav class="quick" :aria-label="t('start.newMatch')">
      <button
        v-for="quick in QUICK_STARTS"
        :key="quick.opponent"
        type="button"
        class="tile"
        :disabled="duel.matchmaking"
        @click="menu.openNewMatch(quick.opponent)"
      >
        <component :is="quick.icon" :size="20" />
        <span>{{ t(quick.label) }}</span>
      </button>
    </nav>

    <button
      v-if="IN_DISCORD"
      type="button"
      class="btn block"
      @click="inviteToActivity(t('start.inviteMessage'))"
    >
      <UserPlus :size="17" /> {{ t('start.invite') }}
    </button>

    <a href="/career" class="contracts" @click.prevent="profile.openCareer()">
      <span class="contracts-head">
        <span class="contracts-title"><Trophy :size="15" /> {{ t('career.tabs.weekly') }}</span>
        <span class="count">{{ completed }}/{{ profile.contracts.length }}</span>
      </span>

      <span class="track"><span :style="{ width: `${Math.round(contractShare * 100)}%` }" /></span>

      <span class="next">
        {{
          nextContract
            ? t('start.home.next', {
                name: t(`career.contracts.${nextContract.id}.name`),
                progress: `${nextContract.progress}/${nextContract.target}`,
              })
            : t('start.home.weekDone')
        }}
        <ChevronRight :size="15" />
      </span>
    </a>

    <div class="news">
      <a :href="`/patches/${LATEST_PATCH.version}/`" class="chip" @click.prevent="notes.open()">
        <ScrollText :size="16" />
        <span>{{ t('patchNotes.patch', { version: LATEST_PATCH.version }) }}</span>
        <span v-if="isFresh(LATEST_PATCH)" class="fresh">{{ t('start.home.fresh') }}</span>
      </a>

      <a v-if="discordHref" :href="discordHref" class="chip" target="_blank" rel="noopener">
        <DiscordIcon :size="16" />
        <span>Discord</span>
      </a>
    </div>

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
.contracts,
.chip,
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

/* The match waiting for the coach: where it stands, and the button to carry on. */
.resume {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(244, 197, 91, 0.45);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.06);
}

.resume-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--chalk-dim);
}

.resume-meta span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-meta span:last-child {
  flex: none;
}

.score {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score :deep(.who) {
  display: none;
}

.vs {
  font-size: 11px;
  color: var(--chalk-faint);
}

.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 64px;
  padding: 8px 4px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--chalk);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.tile svg {
  color: var(--gold);
}

.tile:disabled {
  opacity: 0.5;
}

.contracts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: inherit;
}

.contracts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.contracts-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.contracts-title svg,
.count {
  color: var(--gold);
}

.count {
  font-size: 13px;
  font-weight: 700;
}

.track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffffff12;
}

.track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gold);
  transition: width 0.4s ease-out;
}

.next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.news {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
}

.chip svg {
  flex: none;
  color: var(--gold);
}

.fresh {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
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
