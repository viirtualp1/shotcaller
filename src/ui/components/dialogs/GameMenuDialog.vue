<script setup lang="ts">
import { CircleHelp, GraduationCap, LogOut, Play, RotateCcw, Settings } from 'lucide-vue-next'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'

const menu = useMenuStore()
const store = useMatchStore()
const { t } = useGameText()

function open(dialog: 'help' | 'settings' | 'newMatch'): void {
  menu.gameMenu = false
  menu[dialog] = true
}

function tutorial(): void {
  menu.gameMenu = false
  menu.requestTutorial()
}

function leave(): void {
  menu.gameMenu = false
  store.leaveToMenu()
}
</script>

<template>
  <DialogRoot v-model:open="menu.gameMenu">
    <DialogPortal>
      <DialogOverlay class="overlay menu-overlay" />
      <DialogContent class="game-menu" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ t('app.title') }}</DialogTitle>
        <nav class="items">
          <button type="button" class="btn primary block big" @click="menu.gameMenu = false">
            <Play :size="18" /> {{ t('menu.resume') }}
          </button>
          <button type="button" class="btn block big" @click="open('help')">
            <CircleHelp :size="18" /> {{ t('hud.help') }}
          </button>
          <button type="button" class="btn block big" @click="tutorial">
            <GraduationCap :size="18" /> {{ t('hud.tutorial') }}
          </button>
          <button type="button" class="btn block big" @click="open('settings')">
            <Settings :size="18" /> {{ t('hud.settings') }}
          </button>
          <button type="button" class="btn block big" @click="open('newMatch')">
            <RotateCcw :size="18" /> {{ t('hud.newMatch') }}
          </button>
          <button type="button" class="btn ghost block big" @click="leave">
            <LogOut :size="18" /> {{ t('hud.toMenu') }}
          </button>
        </nav>
        <p class="note">{{ t('hud.saved') }}</p>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.game-menu {
  position: fixed;
  inset: 0;
  z-index: 41;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px 16px;
  animation: fade-in 0.2s ease-out;
}

.title {
  font-size: clamp(56px, 8vw, 88px);
  line-height: 1;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.6);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(340px, 100%);
}

.items .btn {
  animation: slide-up 0.3s ease-out both;
}

.items .btn:nth-child(2) {
  animation-delay: 40ms;
}

.items .btn:nth-child(3) {
  animation-delay: 80ms;
}

.items .btn:nth-child(4) {
  animation-delay: 120ms;
}

.items .btn:nth-child(5) {
  animation-delay: 160ms;
}

.items .btn:nth-child(6) {
  animation-delay: 200ms;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
