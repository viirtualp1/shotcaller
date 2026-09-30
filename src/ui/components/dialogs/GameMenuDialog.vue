<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { CircleHelp, Flag, GraduationCap, LogOut, Play, RotateCcw, Settings } from '@lucide/vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useDuelStore } from '../../stores/duel'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'

const menu = useMenuStore()
const store = useMatchStore()
const duel = useDuelStore()
const { t } = useGameText()
/** Giving up a duel asks once more; the question goes away on its own. */
useModal(() => menu.gameMenu)

const confirmingForfeit = ref(false)

const { start: expireForfeit } = useTimeoutFn(() => (confirmingForfeit.value = false), 3000, {
  immediate: false,
})

function open(dialog: 'help' | 'settings' | 'newMatch') {
  menu.gameMenu = false
  menu[dialog] = true
}

function tutorial() {
  menu.gameMenu = false
  menu.requestTutorial()
}

function leave() {
  menu.gameMenu = false
  store.leaveToMenu()
}

function forfeit() {
  if (!confirmingForfeit.value) {
    confirmingForfeit.value = true
    expireForfeit()

    return
  }

  confirmingForfeit.value = false
  menu.gameMenu = false
  void duel.forfeit()
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

          <button v-if="!store.isDuel" type="button" class="btn block big" @click="tutorial">
            <GraduationCap :size="18" /> {{ t('hud.tutorial') }}
          </button>

          <button type="button" class="btn block big" @click="open('settings')">
            <Settings :size="18" /> {{ t('hud.settings') }}
          </button>

          <button v-if="!store.isDuel" type="button" class="btn block big" @click="open('newMatch')">
            <RotateCcw :size="18" /> {{ t('hud.newMatch') }}
          </button>

          <button
            v-if="store.isDuel && store.phase !== 'finished'"
            type="button"
            class="btn ghost block big"
            :class="{ danger: confirmingForfeit }"
            @click="forfeit"
          >
            <Flag :size="18" /> {{ confirmingForfeit ? t('duel.confirmForfeit') : t('duel.forfeit') }}
          </button>

          <button v-else type="button" class="btn ghost block big" @click="leave">
            <LogOut :size="18" /> {{ t('hud.toMenu') }}
          </button>
        </nav>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.btn.danger {
  border-color: rgba(255, 112, 96, 0.6);
  color: var(--theirs);
}

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

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
