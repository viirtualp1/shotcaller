<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import NewMatchDialog from './components/dialogs/NewMatchDialog.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import GameScreen from './screens/GameScreen.vue'
import StartScreen from './screens/StartScreen.vue'
import { useMatchStore } from './stores/match'

const store = useMatchStore()
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <Transition name="screen" mode="out-in">
      <GameScreen v-if="store.view" />
      <StartScreen v-else />
    </Transition>

    <SettingsDialog />
    <NewMatchDialog />
  </TooltipProvider>
</template>
