<script setup lang="ts">
import { useDocumentVisibility, useElementVisibility, useIntervalFn, useMediaQuery } from '@vueuse/core'
import { Play } from '@lucide/vue'
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import BoardFrame from '../components/board/BoardFrame.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import CoachCard from '../components/home/CoachCard.vue'
import ContractsStrip from '../components/home/ContractsStrip.vue'
import DiscordCard from '../components/home/DiscordCard.vue'
import PatchHighlight from '../components/home/PatchHighlight.vue'
import QuickStarts from '../components/home/QuickStarts.vue'
import SavedMatchCard from '../components/home/SavedMatchCard.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useGameText } from '../composables/useGameText'
import { useUiZoom } from '../composables/useUiZoom'
import { useChatStore } from '../stores/chat'
import { useCloudStore } from '../stores/cloud'
import { useDuelStore } from '../stores/duel'
import { useMenuStore } from '../stores/menu'
import { useReplayStore } from '../stores/replay'
import MobileHome from './MobileHome.vue'

interface DemoLayer {
  readonly id: number
  readonly mode: ModeId
}

/** The show fight moves on to the next mode this often. */
const DEMO_MODE_MS = 15_000
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

/** Phones get their own start screen, laid out for one hand; this one is for wider screens. */
const phone = useMediaQuery('(max-width: 860px)')
const menu = useMenuStore()
const duel = useDuelStore()
const cloud = useCloudStore()
const chat = useChatStore()
const replay = useReplayStore()
const { t } = useGameText()
const visibility = useDocumentVisibility()
/* The side columns grow with the window; the board is not scaled and takes the room left between them. */
const uiZoom = useUiZoom()

const previewHost = ref<HTMLElement | null>(null)
const mounted = ref(false)

/** The board on show, and for a moment the next mode's board fading in over it. */
const demos = ref<DemoLayer[]>([
  {
    id: 0,
    mode: MODE_IDS[0],
  },
])

const previewVisible = useElementVisibility(previewHost)

/** The new board covers the old one now, so the old one can go. */
function demoShown(id: number) {
  demos.value = demos.value.filter((layer) => layer.id >= id)
}

useIntervalFn(() => {
  if (!previewVisible.value || visibility.value !== 'visible') {
    return
  }

  const current = demos.value.at(-1)!

  demos.value = [
    current,
    {
      id: current.id + 1,
      mode: MODE_IDS[(MODE_IDS.indexOf(current.mode) + 1) % MODE_IDS.length]!,
    },
  ]
}, DEMO_MODE_MS)

/* The friends window sits in the left column here, unless a replay covers the menu. */
watchEffect(() => {
  chat.docked = mounted.value && !phone.value && cloud.enabled && !replay.match && !replay.liveFriend
})

onMounted(() => {
  mounted.value = true
})

/* Leaving the menu must not pop the window up over the next page. */
onBeforeUnmount(() => {
  mounted.value = false
  chat.docked = false
  chat.minimize()
})
</script>

<template>
  <MobileHome v-if="phone" />

  <main v-else class="start" :style="{ '--ui-zoom': uiZoom }">
    <h1 class="sr-only">{{ t('app.title') }}</h1>

    <div class="layout">
      <div class="column side">
        <CoachCard />

        <div class="menu">
          <DuelResumeCard />
          <SavedMatchCard />
          <ContractsStrip />
        </div>

        <div v-if="cloud.enabled" id="home-friends" class="friends" />

        <footer class="footer">
          <LanguageSwitch compact />
          <SupportButton />
          <LegalLinks />
        </footer>
      </div>

      <div class="column center">
        <section ref="previewHost" class="preview">
          <BoardFrame>
            <DemoBattle
              v-for="layer in previewVisible ? demos : []"
              :key="layer.id"
              :mode="layer.mode"
              @shown="demoShown(layer.id)"
            />
          </BoardFrame>
        </section>
      </div>

      <div class="column side">
        <MovedCard />
        <PatchHighlight />
        <DiscordCard />

        <div class="launch">
          <QuickStarts />

          <button
            type="button"
            class="play"
            :disabled="duel.matchmaking"
            @click="menu.openNewMatch('computer')"
          >
            <Play :size="22" />
            {{ t('start.home.play') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* The menu fills the screen inside the page's padding: profile in the top left corner, Play in the bottom right. */
.start {
  --ui-zoom: 1;
  --gap: calc(24px * var(--ui-zoom));
  --pad-y: calc(24px * var(--ui-zoom));
  --pad-x: calc(32px * var(--ui-zoom));
  --side-min: calc(clamp(240px, 18vw, 290px) * var(--ui-zoom));
  --height: max(100dvh, 600px);
  /* The square board takes the full height when the width allows; the side columns share what is left. */
  --board: min(
    var(--height) - 2 * var(--pad-y),
    100vw - 2 * var(--pad-x) - 2 * var(--gap) - 2 * var(--side-min)
  );
  display: flex;
  height: var(--height);
  padding: var(--pad-y) var(--pad-x);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(var(--side-min), 1fr) var(--board) minmax(var(--side-min), 1fr);
  gap: var(--gap);
  min-height: 0;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  animation: fade-in 0.4s 0.1s ease-out both;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu > * {
  animation: slide-in 0.34s ease-out both;
}

.menu > :nth-child(2) {
  animation-delay: 40ms;
}

.menu > :nth-child(n + 3) {
  animation-delay: 80ms;
}

/* The side columns run the full height of the screen and are drawn at the interface scale. */
.side {
  zoom: var(--ui-zoom);
  height: 0;
  min-height: 100%;
}

.friends {
  flex: 1;
  display: flex;
  min-height: 0;
}

.friends :deep(.social-window) {
  flex: 1;
}

.preview {
  width: var(--board);
}

/* Picking an opponent and starting the match sit together at the foot of the column. */
.launch {
  display: grid;
  gap: 10px;
  margin-top: auto;
}

.play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 22px;
  border: 0;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font: inherit;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
  transition: filter 0.15s;
}

.play:hover:not(:disabled) {
  filter: brightness(1.08);
}

.play:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Language, support and the legal links close the left column, under the friends list and as wide as it. */
.footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  animation: fade-in 0.4s 0.2s ease-out both;
}

.footer :deep(.support-button) {
  justify-content: center;
  width: 100%;
}

.footer :deep(.legal-links) {
  grid-column: 1 / -1;
}
</style>
