<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { TooltipProvider } from 'reka-ui'
import { computed } from 'vue'
import { IN_DISCORD } from '@/application/discord'
import UpdateToast from './components/common/UpdateToast.vue'
import MobileTabBar from './components/home/MobileTabBar.vue'
import CloudConflictDialog from './components/dialogs/CloudConflictDialog.vue'
import NewMatchDialog from './components/dialogs/NewMatchDialog.vue'
import SignInDialog from './components/dialogs/SignInDialog.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import TelemetryConsentDialog from './components/dialogs/TelemetryConsentDialog.vue'
import CoachProfileDialog from './components/social/CoachProfileDialog.vue'
import ChallengeDialog from './components/social/ChallengeDialog.vue'
import DuelInviteDialog from './components/social/DuelInviteDialog.vue'
import NotificationStack from './components/social/NotificationStack.vue'
import SocialWindow from './components/social/SocialWindow.vue'
import FriendsButton from './components/social/FriendsButton.vue'
import MatchmakingStatus from './components/social/MatchmakingStatus.vue'
import GameScreen from './screens/GameScreen.vue'
import ReplayScreen from './screens/ReplayScreen.vue'
import LiveMatchWaiting from './screens/LiveMatchWaiting.vue'
import PatchNotesScreen from './screens/PatchNotesScreen.vue'
import LegalScreen from './screens/LegalScreen.vue'
import ProfileScreen from './screens/ProfileScreen.vue'
import CareerScreen from './screens/CareerScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import LeaderboardScreen from './screens/LeaderboardScreen.vue'
import { useChatStore } from './stores/chat'
import { useCloudStore } from './stores/cloud'
import { useDuelStore } from './stores/duel'
import { useSystemNotificationsStore } from './stores/systemNotifications'
import { useFriendsStore } from './stores/friends'
import { useMatchStore } from './stores/match'
import { useDocumentHead } from './composables/useDocumentHead'
import { usePatchNotesStore } from './stores/patchNotes'
import { useProfileStore } from './stores/profile'
import { usePrivacyStore } from './stores/privacy'
import { useReplayStore } from './stores/replay'
import { useGameAudio } from './composables/useGameAudio'
import { useLeaderboardStore } from './stores/leaderboard'
import { useLegalStore } from './stores/legal'

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
const profile = useProfileStore()
const replay = useReplayStore()
const leaderboard = useLeaderboardStore()
const legal = useLegalStore()
const phone = useMediaQuery('(max-width: 860px)')
useGameAudio()

/* Started with the app: it picks up a sign-in link and pulls progress saved on other devices. */
const cloud = useCloudStore()
usePrivacyStore()

/* Also started with the app, so a signed-in coach shows up online for their friends. */
useFriendsStore()
useChatStore()
useDuelStore()
useSystemNotificationsStore()

/**
 * Pages share the friends shortcut. The game has its own in the menu,
 * so it shows over a match only while a page such as the patch notes covers the board.
 */
const showFriendsLauncher = computed(
  () =>
    replay.match !== null ||
    patchNotes.patch !== null ||
    legal.document !== null ||
    leaderboard.isOpen ||
    !store.view,
)

/** The board of a match in progress is on screen, with no page covering it. */
const onBoard = computed(
  () => store.view !== null && patchNotes.patch === null && legal.document === null && !leaderboard.isOpen,
)

/** Phones navigate between pages with a tab bar; a match and a replay keep the whole screen. */
const showTabs = computed(
  () => phone.value && !onBoard.value && replay.match === null && replay.liveFriend === null,
)

/** Each screen opens at its top, as a new page does, not where the one before was scrolled to. */
const scrollToTop = () => globalThis.scrollTo({ top: 0 })

useDocumentHead()
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <MatchmakingStatus />

    <Transition name="screen" mode="out-in" @after-leave="scrollToTop">
      <LegalScreen v-if="legal.document" />
      <PatchNotesScreen v-else-if="patchNotes.patch" />
      <LeaderboardScreen v-else-if="leaderboard.isOpen" />
      <GameScreen v-else-if="store.view" />
      <CareerScreen v-else-if="profile.isCareer" />
      <ProfileScreen v-else-if="profile.isOpen" />
      <StartScreen v-else />
    </Transition>

    <MobileTabBar v-if="showTabs" />

    <ReplayScreen v-if="replay.match" :key="replay.match.id" :match="replay.match" />

    <LiveMatchWaiting v-else-if="replay.liveFriend" />

    <SettingsDialog />

    <NewMatchDialog />
    <!-- Discord serves the Activity through its own proxy, and every launch already loads the latest version. -->
    <UpdateToast v-if="!IN_DISCORD" />

    <template v-if="cloud.enabled">
      <SignInDialog />
      <CloudConflictDialog />
      <TelemetryConsentDialog />
      <CoachProfileDialog />
      <SocialWindow />

      <div v-if="showFriendsLauncher" class="social-launcher" :class="{ 'in-replay': replay.match }">
        <FriendsButton compact floating />
      </div>

      <ChallengeDialog />
      <DuelInviteDialog />
      <NotificationStack />
    </template>
  </TooltipProvider>
</template>

<style scoped>
.social-launcher {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 39;
}
/* The phone's tab bar has the friends button; this one would sit on top of it. */
:global(#app:has(.mobile-tabs) .social-launcher) {
  display: none;
}

/* Every page leaves room at the bottom for the tab bar. */
:global(#app:has(.mobile-tabs)) {
  --mobile-tabs: 62px;
  min-height: 100%;
  height: auto;
  padding-bottom: calc(var(--mobile-tabs) + env(safe-area-inset-bottom, 0px));
}

.social-launcher.in-replay {
  right: auto;
  left: calc(16px + env(safe-area-inset-left, 0px));
}

/* On small screens the fixed search bar spans the navigation; keep its links within reach. */
@media (max-width: 860px) {
  :global(#app:has(.matchmaking) .start),
  :global(#app:has(.matchmaking) .mobile-home) {
    padding-top: calc(108px + env(safe-area-inset-top, 0px));
  }

  :global(#app:has(.matchmaking) .topbar) {
    padding-top: calc(72px + env(safe-area-inset-top, 0px));
  }
}
</style>
