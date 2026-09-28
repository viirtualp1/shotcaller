<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import UpdateToast from './components/common/UpdateToast.vue'
import CloudConflictDialog from './components/dialogs/CloudConflictDialog.vue'
import NewMatchDialog from './components/dialogs/NewMatchDialog.vue'
import SignInDialog from './components/dialogs/SignInDialog.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import CoachProfileDialog from './components/social/CoachProfileDialog.vue'
import ChallengeDialog from './components/social/ChallengeDialog.vue'
import DuelInviteDialog from './components/social/DuelInviteDialog.vue'
import NotificationStack from './components/social/NotificationStack.vue'
import SocialWindow from './components/social/SocialWindow.vue'
import GameScreen from './screens/GameScreen.vue'
import PatchNotesScreen from './screens/PatchNotesScreen.vue'
import ProfileScreen from './screens/ProfileScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import { useChatStore } from './stores/chat'
import { useCloudStore } from './stores/cloud'
import { useDuelStore } from './stores/duel'
import { useSystemNotificationsStore } from './stores/systemNotifications'
import { useFriendsStore } from './stores/friends'
import { useMatchStore } from './stores/match'
import { usePatchNotesStore } from './stores/patchNotes'
import { useProfileStore } from './stores/profile'

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
const profile = useProfileStore()
/* Started with the app: it picks up a sign-in link and pulls progress saved on other devices. */
const cloud = useCloudStore()
/* Also started with the app, so a signed-in coach shows up online for their friends. */
useFriendsStore()
useChatStore()
useDuelStore()
useSystemNotificationsStore()
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <Transition name="screen" mode="out-in">
      <GameScreen v-if="store.view" />
      <PatchNotesScreen v-else-if="patchNotes.patch" />
      <ProfileScreen v-else-if="profile.isOpen" />
      <StartScreen v-else />
    </Transition>

    <SettingsDialog />
    <NewMatchDialog />
    <UpdateToast />

    <template v-if="cloud.enabled">
      <SignInDialog />
      <CloudConflictDialog />
      <CoachProfileDialog />
      <SocialWindow />
      <ChallengeDialog />
      <DuelInviteDialog />
      <NotificationStack />
    </template>
  </TooltipProvider>
</template>
