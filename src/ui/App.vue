<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { computed } from 'vue'
import UpdateToast from './components/common/UpdateToast.vue'
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

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
const profile = useProfileStore()
const replay = useReplayStore()
const leaderboard = useLeaderboardStore()
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
 * Every page but the main one gets the friends shortcut. The game has its own in the menu,
 * so it shows over a match only while a page such as the patch notes covers the board.
 */
const showFriendsLauncher = computed(
  () =>
    replay.match !== null ||
    patchNotes.patch !== null ||
    leaderboard.isOpen ||
    (!store.view && (profile.isOpen || profile.isCareer)),
)

/** Each screen opens at its top, as a new page does, not where the one before was scrolled to. */
const scrollToTop = () => globalThis.scrollTo({ top: 0 })

useDocumentHead()
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <MatchmakingStatus />

    <Transition name="screen" mode="out-in" @after-leave="scrollToTop">
      <PatchNotesScreen v-if="patchNotes.patch" />
      <LeaderboardScreen v-else-if="leaderboard.isOpen" />
      <GameScreen v-else-if="store.view" />
      <CareerScreen v-else-if="profile.isCareer" />
      <ProfileScreen v-else-if="profile.isOpen" />
      <StartScreen v-else />
    </Transition>

    <ReplayScreen v-if="replay.match" :key="replay.match.id" :match="replay.match" />
    <LiveMatchWaiting v-else-if="replay.liveFriend" />
    <SettingsDialog />
    <NewMatchDialog />
    <UpdateToast />

    <template v-if="cloud.enabled">
      <SignInDialog />
      <CloudConflictDialog />
      <TelemetryConsentDialog />
      <CoachProfileDialog />
      <SocialWindow />

      <div
        v-if="showFriendsLauncher"
        class="social-launcher"
        :class="{ 'in-replay': replay.match }"
      >
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
.social-launcher.in-replay {
  right: auto;
  left: calc(16px + env(safe-area-inset-left, 0px));
}

/* On small screens the fixed search bar spans the navigation; keep its links within reach. */
@media (max-width: 860px) {
  :global(#app:has(.matchmaking) .start) {
    padding-top: calc(108px + env(safe-area-inset-top, 0px));
  }

  :global(#app:has(.matchmaking) .topbar) {
    padding-top: calc(72px + env(safe-area-inset-top, 0px));
  }
}
</style>
