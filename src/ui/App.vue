<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import NewMatchDialog from './components/dialogs/NewMatchDialog.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import GameScreen from './screens/GameScreen.vue'
import PatchNotesScreen from './screens/PatchNotesScreen.vue'
import ProfileScreen from './screens/ProfileScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import { useMatchStore } from './stores/match'
import { usePatchNotesStore } from './stores/patchNotes'
import { useProfileStore } from './stores/profile'

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
const profile = useProfileStore()
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
  </TooltipProvider>
</template>
