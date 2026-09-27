<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import NewMatchDialog from './components/dialogs/NewMatchDialog.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import GameScreen from './screens/GameScreen.vue'
import PatchNotesScreen from './screens/PatchNotesScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import { useMatchStore } from './stores/match'
import { usePatchNotesStore } from './stores/patchNotes'

const store = useMatchStore()
const patchNotes = usePatchNotesStore()
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <Transition name="screen" mode="out-in">
      <GameScreen v-if="store.view" />
      <PatchNotesScreen v-else-if="patchNotes.patch" />
      <StartScreen v-else />
    </Transition>

    <SettingsDialog />
    <NewMatchDialog />
  </TooltipProvider>
</template>
