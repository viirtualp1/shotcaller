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
import ReplayScreen from './screens/ReplayScreen.vue'
import PatchNotesScreen from './screens/PatchNotesScreen.vue'
import ProfileScreen from './screens/ProfileScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import { useChatStore } from './stores/chat'
import { useCloudStore } from './stores/cloud'
import { useDuelStore } from './stores/duel'
import { useSystemNotificationsStore } from './stores/systemNotifications'
import { useFriendsStore } from './stores/friends'
import { useMatchStore } from './stores/match'
import { useDocumentHead } from './composables/useDocumentHead'
import { usePatchNotesStore } from './stores/patchNotes'
import { useProfileStore } from './stores/profile'
import { useReplayStore } from './stores/replay'
import { useAudioStore } from './stores/audio'
import { onBeforeUnmount, watch, watchEffect } from 'vue'

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
useDocumentHead()
const profile = useProfileStore()
const replay = useReplayStore()
const audio = useAudioStore()
/* Started with the app: it picks up a sign-in link and pulls progress saved on other devices. */
const cloud = useCloudStore()
/* Also started with the app, so a signed-in coach shows up online for their friends. */
useFriendsStore()
useChatStore()
useDuelStore()
useSystemNotificationsStore()

watchEffect(() => {
  if (replay.match) {
    audio.setMusic('battle')
  } else if (patchNotes.patch || profile.isOpen || !store.view) {
    audio.setMusic(null)
  } else if (store.phase === 'battle') {
    const throneUnderThirtyPercent = store.simulation?.queries.structures.entities.some(
      (structure) =>
        structure.structure?.type === 'throne' && structure.health.current / structure.health.max <= 0.3,
    )

    const battleNearEnd = (store.live?.duration ?? 0) - (store.live?.elapsed ?? 0) <= 18
    audio.setMusic(throneUnderThirtyPercent || battleNearEnd ? 'climax' : 'battle')
  } else if (store.phase === 'finished') {
    audio.setMusic(null)
  } else {
    audio.setMusic('preparation')
  }
})

watch(
  () => [store.simulation, store.view?.side] as const,
  ([simulation, side]) => audio.bindSimulation(simulation?.events, side ?? 0),
  { immediate: true },
)

watch(
  () => store.view?.history.length ?? 0,
  (count, previous) => {
    if (count > previous) {
      audio.playRoundResult(store.view?.history.at(-1) ?? 'draw')
    }
  },
)

let matchResultTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => (store.phase === 'finished' ? store.view?.result : null),
  (result) => {
    if (matchResultTimer) {
      clearTimeout(matchResultTimer)
      matchResultTimer = undefined
    }

    if (result?.winner === null || result?.winner === undefined) {
      return
    }

    matchResultTimer = setTimeout(() => {
      audio.playMatchResult(result.winner === store.view?.side ? 'win' : 'loss')
    }, 900)
  },
)

onBeforeUnmount(() => {
  if (matchResultTimer) {
    clearTimeout(matchResultTimer)
  }

  audio.dispose()
})

/** Each screen opens at its top, as a new page does, not where the one before was scrolled to. */
const scrollToTop = () => globalThis.scrollTo({ top: 0 })
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <Transition name="screen" mode="out-in" @after-leave="scrollToTop">
      <PatchNotesScreen v-if="patchNotes.patch" />
      <GameScreen v-else-if="store.view" />
      <ProfileScreen v-else-if="profile.isOpen" />
      <StartScreen v-else />
    </Transition>

    <ReplayScreen v-if="replay.match" :key="replay.match.id" :match="replay.match" />

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
